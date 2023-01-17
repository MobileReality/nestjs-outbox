import type { OutboxModuleEngineBaseConfig } from '../engines.config';
import type { EntityManager } from 'typeorm';

export interface OutboxModuleTypeormConfig extends OutboxModuleEngineBaseConfig<EntityManager> {
    engine: 'typeorm';
    flavor: 'mysql' | 'mariadb' | 'postgres';
}
