import { ConflictException } from '@nestjs/common';
import type { OutboxModuleConfig } from '../core/outbox.config';
import { TransactionResolverEnum } from '../core/outbox.config';
import type { RegisteredOutbox, RegisteredOutboxMethod } from '../core/common';
import { isSerializable } from '../core/common';
import type { OutboxModuleEngineConfig } from './engines.config';
import type { OutboxEntity } from './typeorm/outbox.entity';
import type { EntityManager } from 'typeorm';

export abstract class OutboxPersistenceEngine<T> {
    protected constructor(protected readonly config: OutboxModuleConfig) {}

    protected async callOriginal(
        outbox: RegisteredOutbox,
        args: any[],
        manager: EntityManager | null,
        outboxInfo: OutboxEntity | false = false,
    ) {
        const original = outbox.originalFunction;
        let finalArgs = args;
        const txPos = outbox.transactionParamPos ?? -1;
        if (this.config.appendOutboxInfo || txPos > -1) {
            // We need to fill optional parameters with undefined
            const knownPos = txPos === -1 ? outbox.argumentCount ?? args.length - 1 : txPos;
            const missing = knownPos - args.length;
            const fillers =
                // eslint-disable-next-line unicorn/no-useless-undefined
                missing > 0 ? Array.from({ length: missing }).fill(undefined) : [];
            finalArgs = [...args, ...fillers];
            finalArgs[knownPos] = manager;
            if (this.config.appendOutboxInfo) {
                finalArgs.push(outboxInfo);
            }
        }
        return await original.apply(outbox.originalThis, finalArgs);
    }

    public abstract pollOutbox(sequential: boolean, name: string): Promise<void>;
    public abstract getTransactionClass(): (new (...args: any[]) => T) | null;
    public abstract saveOutboxCall(
        transactionObject: T | null,
        outbox: RegisteredOutbox,
        ...args: any[]
    ): Promise<void>;
    public hookOriginal(config: OutboxModuleEngineConfig, outbox: RegisteredOutboxMethod) {
        // Hook the function
        outbox.originalThis[outbox.methodKey] = async (...args: any[]) => {
            const transactionObject: T | undefined =
                config.transactionResolver === TransactionResolverEnum.PARAM
                    ? (args[outbox.transactionParamPos] as T)
                    : ((await config.transactionResolver?.()) as T | undefined);

            if (!transactionObject) {
                if (!outbox.allowInstant) {
                    throw new ConflictException(
                        'No transaction found while allowInstant is not true',
                    );
                }
                if (outbox.instantBypass) {
                    return await this.callOriginal(outbox, args, null, false);
                }
                await this.saveOutboxCall(null, outbox, args);
                return;
            }
            const filteredArgs =
                config.transactionResolver === TransactionResolverEnum.PARAM
                    ? args.slice(0, -1)
                    : args;
            if (!isSerializable(filteredArgs)) {
                throw new ConflictException('Outbox arguments must be serializable');
            }
            await this.saveOutboxCall(transactionObject, outbox, filteredArgs);
        };
        outbox.originalThis[outbox.methodKey].outbox = outbox;
    }
}
