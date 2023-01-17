import { forwardRef, Module, NotImplementedException } from '@nestjs/common';
import { OutboxPersistenceEngine } from '../engine.service';
import { OUTBOX_MODULE_CONFIG } from '../../core/outbox.config';
import type { OutboxModuleTypeormConfig } from './typeorm.config';
import { MysqlPersistenceService } from './mysql.engine';
import { OutboxModule } from '../../core/outbox.module';
import type { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface';
import { ModuleRef } from '@nestjs/core/injector/module-ref';

const engineProvider: FactoryProvider = {
    provide: OutboxPersistenceEngine,
    useFactory: async (options: OutboxModuleTypeormConfig, moduleRef: ModuleRef) => {
        switch (options.flavor) {
            case 'mysql':
            case 'mariadb':
            case 'postgres':
                return await moduleRef.create(MysqlPersistenceService);
            default:
                throw new NotImplementedException(
                    `Engine flavor [${options.flavor}] not supported`,
                );
        }
    },
    inject: [OUTBOX_MODULE_CONFIG, ModuleRef],
};

@Module({
    imports: [forwardRef(() => OutboxModule)],
    providers: [engineProvider],
    exports: [OutboxPersistenceEngine],
})
export class TypeormEngineModule {}
