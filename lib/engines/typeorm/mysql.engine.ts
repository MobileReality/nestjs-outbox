import type { DeepPartial } from 'typeorm';
import { Connection, EntityManager } from 'typeorm';
import { OutboxPersistenceEngine } from '../engine.service';
import type { RegisteredOutbox } from '../../core/common';
import { ConflictException, forwardRef, Inject, Injectable } from '@nestjs/common';
import addMilliseconds from 'date-fns/addMilliseconds';
import {
    OUTBOX_MODULE_CONFIG,
    OUTBOX_RETRY_INTERVAL,
    OutboxModuleConfig,
} from '../../core/outbox.config';
import { OutboxEntity, OutboxEntityPostgres, OutboxStatus } from './outbox.entity';
import { OutboxService } from '../../core/outbox.service';
import type pino from 'pino';
import { addSeconds } from 'date-fns';
import { OracleDriver } from 'typeorm/driver/oracle/OracleDriver';

// TODO can this work with oracle too?

@Injectable()
export class MysqlPersistenceService extends OutboxPersistenceEngine<EntityManager> {
    private readonly logger: pino.Logger;
    constructor(
        private readonly connection: Connection,
        @Inject(forwardRef(() => OutboxService))
        private readonly outboxService: OutboxService,
        @Inject(forwardRef(() => OUTBOX_MODULE_CONFIG))
        config: OutboxModuleConfig,
    ) {
        super(config);
        this.logger = this.config.logger!.child({ ctx: this.constructor.name });
    }

    public getTransactionClass() {
        return EntityManager;
    }
    async saveOutboxCall(
        entityManager: EntityManager | null,
        outbox: RegisteredOutbox,
        args: any,
    ): Promise<void> {
        // eslint-disable-next-line no-param-reassign
        if (!entityManager) entityManager = this.connection.manager;
        const serializedArgs = JSON.stringify(args);
        await entityManager.insert(OutboxEntity, {
            name: outbox.name,
            grouping: outbox.grouping,
            nextRetry: addSeconds(new Date(), outbox.delay),
            serializedArgs,
        });
    }

    async pollOutbox(sequential: boolean, groupingName: string): Promise<void> {
        await this.connection.transaction(async (manager: EntityManager) => {
            let pendings: OutboxEntity[];
            try {
                const query = manager
                    .getRepository(OutboxEntity)
                    .createQueryBuilder('o')
                    .where('o.status = :status', {
                        status: OutboxStatus.PENDING,
                    });
                if (!sequential) {
                    query.andWhere('o.next_retry < CURRENT_TIMESTAMP(6)');
                }
                pendings = await query
                    .andWhere('o.grouping = :groupingName', { groupingName })
                    .limit(10) // TODO batch size
                    .orderBy(sequential ? 'o.created_at' : 'o.next_retry', 'ASC')
                    .setLock(sequential ? 'pessimistic_write_or_fail' : 'pessimistic_partial_write')
                    .getMany();
            } catch (err: any) {
                // handle NOWAIT error gracefully
                if (sequential && (err?.errno === 3572 || err?.errno === 1205) /* mariadb */) {
                    return;
                }
                throw err;
            }
            const processed: DeepPartial<OutboxEntity>[] = [];
            for (const pending of pendings) {
                let success = false;
                const outbox = this.outboxService.outboxes.get(pending.name);
                try {
                    if (!outbox || outbox.grouping !== groupingName) {
                        // noinspection ExceptionCaughtLocallyJS
                        throw new ConflictException(
                            `Invalid outbox ${pending.name} for pending id ${pending.id}`,
                        );
                    }
                    const deserializedArgs = JSON.parse(pending.serializedArgs);

                    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
                    // @ts-ignore
                    if (manager.connection.driver.transactionSupport === 'nested') {
                        await manager.transaction(async (internalManager) => {
                            await this.callOriginal(
                                outbox,
                                deserializedArgs,
                                internalManager,
                                pending,
                            );
                        });
                    } else {
                        await manager.query('SAVEPOINT outbox_internal');
                        try {
                            await this.callOriginal(outbox, deserializedArgs, manager, pending);
                        } catch (err) {
                            await manager.query('ROLLBACK TO SAVEPOINT outbox_internal');
                            // noinspection ExceptionCaughtLocallyJS
                            throw err;
                        } finally {
                            // eslint-disable-next-line max-depth
                            if (!(manager.connection.driver instanceof OracleDriver)) {
                                await manager.query('RELEASE SAVEPOINT outbox_internal');
                            }
                        }
                    }

                    success = true;
                } catch (err) {
                    this.logger.error({ err, pending, outbox }, `Error during outbox processing`);
                    // TODO log
                    success = false;
                }
                processed.push({
                    // TODO postgres engine workaround
                    // @ts-expect-error
                    id_overwrite: pending.id,
                    id: pending.id,
                    name: pending.name,
                    grouping: pending.grouping,
                    serializedArgs: pending.serializedArgs,
                    status: success ? OutboxStatus.SENT : pending.status,
                    retryCount: success ? pending.retryCount : pending.retryCount + 1,
                    nextRetry: success
                        ? pending.nextRetry
                        : addMilliseconds(
                              new Date(),
                              OUTBOX_RETRY_INTERVAL * (pending.retryCount + 1),
                          ),
                });
                if (!success && sequential) break;
            }
            await manager
                .createQueryBuilder()
                .insert()
                // TODO postgres engine workaround
                .into(this.config.flavor === 'postgres' ? OutboxEntityPostgres : OutboxEntity)
                .values(processed)
                .orUpdate(['status', 'retry_count', 'next_retry'], ['id'])
                .execute();
        });
    }
}
