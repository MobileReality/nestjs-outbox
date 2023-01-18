import { ConflictException } from '@nestjs/common';
import type { OutboxModuleConfig } from '../core/outbox.config';
import { TransactionResolverEnum } from '../core/outbox.config';
import type { RegisteredOutbox, RegisteredOutboxMethod } from '../core/common';
import { isSerializable } from '../core/common';
import type { OutboxModuleEngineConfig } from './engines.config';
import type { OutboxEntity } from './typeorm/outbox.entity';

export abstract class OutboxPersistenceEngine<T> {
    protected constructor(protected readonly config: OutboxModuleConfig) {}

    protected async callOriginal(
        outbox: RegisteredOutbox,
        args: any[],
        outboxInfo: OutboxEntity | false = false,
    ) {
        const original = outbox.originalFunction;
        let finalArgs = args;
        if (this.config.appendOutboxInfo) {
            // We need to fill optional parameters with undefined
            const missing = (outbox.argumentCount ?? 0) - args.length;
            const fillers =
                // eslint-disable-next-line unicorn/no-useless-undefined
                missing > 0 ? Array.from({ length: missing }).fill(undefined) : [];
            finalArgs = [...args, ...fillers, outboxInfo];
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
        const paramPosition = this.getParamPosition(config, outbox);
        // Hook the function
        outbox.originalThis[outbox.methodKey] = async (...args: any[]) => {
            const transactionObject: T | undefined =
                config.transactionResolver === TransactionResolverEnum.PARAM
                    ? (args[paramPosition] as T)
                    : ((await config.transactionResolver?.()) as T | undefined);

            if (!transactionObject) {
                if (!outbox.allowInstant) {
                    throw new ConflictException(
                        'No transaction found while allowInstant is not true',
                    );
                }
                if (outbox.instantBypass) {
                    return await this.callOriginal(outbox, args, false);
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
    private getParamPosition(
        config: OutboxModuleEngineConfig,
        outbox: RegisteredOutboxMethod,
    ): number {
        const types = Reflect.getMetadata(
            'design:paramtypes',
            outbox.originalThis,
            outbox.methodKey,
        );
        if (config.transactionResolver === TransactionResolverEnum.PARAM) {
            const transactionClass = this.getTransactionClass();
            if (!transactionClass) {
                throw new ConflictException(
                    `Transaction resolver is set to PARAM, but not supported by persistence provider ${this.constructor.name}`,
                );
            }
            if (types.length === 0 || types[types.length - 1] !== transactionClass) {
                throw new ConflictException(
                    `Transaction resolver is set to PARAM, but last parameter is not of type ${transactionClass.name}`,
                );
            }
            return types.length - 1;
        }
        return -1;
    }
}
