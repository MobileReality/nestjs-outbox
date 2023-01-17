import type { TransactionResolverEnum } from '../core/outbox.config';
import type { OutboxModuleTypeormConfig } from './typeorm/typeorm.config';
// @ts-expect-error
import type { EntityManager } from '@mikro-orm/postgresql';

export type TransactionResolverCallback<T> = (() => Promise<T>) | (() => T);

export interface OutboxModuleEngineBaseConfig<T> {
    transactionResolver?: TransactionResolverEnum | TransactionResolverCallback<T>;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface OutboxModuleMikroORMConfig extends OutboxModuleEngineBaseConfig<EntityManager> {
    engine: 'mikro-orm';
    flavor: 'postgresql';
}
export type OutboxModuleEngineConfig = OutboxModuleTypeormConfig; // | OutboxModuleMikroORMConfig;
