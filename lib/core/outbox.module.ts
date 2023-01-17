import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import type { OutboxModuleConfig } from './outbox.config';
import { defaultConfig, OUTBOX_MODULE_CONFIG } from './outbox.config';
import { engineImplementations } from '../engines/engines';
import type { ValueProvider } from '@nestjs/common/interfaces/modules/provider.interface';
import { createLogger } from './logger.helper';
import { OutboxService } from './outbox.service';

// TypeOrmModule.forFeature([OutboxEntity])

@Module({})
export class OutboxModule {
    static forRoot(options: OutboxModuleConfig): DynamicModule {
        const config = {
            ...defaultConfig,
            ...options,
            logger: options.logger ?? createLogger(),
        };

        const configProvider: ValueProvider<OutboxModuleConfig> = {
            provide: OUTBOX_MODULE_CONFIG,
            useValue: config,
        };
        return {
            global: options.global ?? true,
            module: OutboxModule,
            imports: [DiscoveryModule, { module: engineImplementations[options.engine] }],
            providers: [configProvider, OutboxService],
            exports: [configProvider, OutboxService],
        };
    }
}
