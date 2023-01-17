import type { ConnectionOptions } from 'typeorm';
import { Connection } from 'typeorm';
import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxModule } from '../../../lib/core/outbox.module';
import { TransactionResolverEnum } from '../../../lib/core/outbox.config';
import { OutboxEntity, OutboxEntityPostgres } from '../../../lib/engines/typeorm/outbox.entity';
import { TestService } from '../../generic/test.service';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import '../../utils/app-creator';
import type { CreateAppOptions } from '../../utils/app-creator';

import { encodingExists } from 'iconv-lite';

encodingExists('foo');

@Module({})
export class App {
    static create(
        db_type: 'mysql' | 'mariadb' | 'postgres',
        options?: CreateAppOptions,
    ): DynamicModule {
        const imports = [
            TypeOrmModule.forRoot({
                type: process.env.DB_TYPE,
                host: process.env.DB_HOSTNAME,
                port: Number(process.env.DB_PORT),
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DATABASE,
                entities:
                    // TODO postgres engine workaround
                    db_type === 'postgres' ? [OutboxEntity, OutboxEntityPostgres] : [OutboxEntity],
                synchronize: true,
                logging: false,
                migrationsRun: false,
            } as ConnectionOptions),
            OutboxModule.forRoot({
                engine: 'typeorm',
                flavor: db_type,
                autostartPolling: options?.autostartPolling,
                appendOutboxInfo: options?.appendOutboxInfo,
                // @ts-expect-error
                transactionResolver: options?.transactionResolver ?? TransactionResolverEnum.PARAM,
            }),
        ];

        return {
            module: App,
            imports,
            providers: [TestService],
            controllers: [],
            exports: [TestService],
        };
    }
}

export async function createTestApp(options?: CreateAppOptions) {
    const db_type = global.db_type;
    if (!db_type || !['mysql', 'mariadb', 'postgres'].includes(db_type))
        throw new Error(`Unknown database type: ${db_type}`);

    const { parsed: parsed1 } = config({ path: `${__dirname}/../../.env.typeorm-${db_type}` });
    const { parsed: parsed2 } = config({
        path: `${__dirname}/../../.env.typeorm-${db_type}.local`,
    });
    process.env = { ...process.env, ...parsed1, ...parsed2 };

    // @ts-expect-error
    const module = App.create(db_type, options);

    const context = await NestFactory.createApplicationContext(module, {
        //abortOnError: false,
        logger: ['error'],
    });

    await context.get(Connection).getRepository(OutboxEntity).clear();

    return context;
}
global.createTestApp = createTestApp;
