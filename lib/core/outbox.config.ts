import type { OutboxModuleEngineConfig } from '../engines';
// import type { LoggerService } from '@nestjs/common';
import type pino from 'pino';

export const OUTBOX_MODULE_CONFIG = 'OUTBOX_MODULE_CONFIG';

export const OUTBOX_RETRY_INTERVAL = 10_000; // TODO read from config

export enum TransactionResolverEnum {
    PARAM = 'param',
}

export interface OutboxModuleBaseConfig {
    engine: string;
    transactionResolver?: TransactionResolverEnum;
    allowInstant?: boolean;
    appendOutboxInfo?: boolean;
    autostartPolling?: boolean;
    pollingInterval?: number;

    // TODO nestjs logging service support?
    logger?: /* LoggerService |*/ pino.Logger;
    global?: boolean;
}

export type OutboxModuleConfig = OutboxModuleBaseConfig & OutboxModuleEngineConfig;

export const defaultConfig: Omit<OutboxModuleBaseConfig, 'engine'> = {
    appendOutboxInfo: false,
    autostartPolling: true,
    global: true,
    transactionResolver: TransactionResolverEnum.PARAM,
};
