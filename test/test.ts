import { NestFactory } from '@nestjs/core';
import { App } from './engine/typeorm/app';
import { TestService } from './generic/test.service';
import { Connection, createConnection } from 'typeorm';
import { OutboxEntity } from '../lib/engines/typeorm/outbox.entity';
import { OutboxService } from '../lib/core/outbox.service';

(async () => {
    const app = await NestFactory.create(App, {
        bodyParser: true,
        abortOnError: false,
        logger: false,
        cors: true,
    });
    const tester = app.get(TestService);
    await app.listen(6699);
    tester.testInstant(666, { lol: 1 });
    const conn = app.get(Connection);
    const other = await createConnection({ ...conn.options, name: 'other' });
    await conn.transaction(async (manager) => {
        await tester.test(666, { lol: 1, outboxed: true }, manager);
    });
    await other.transaction(async (manager2) => {
        await manager2.find(OutboxEntity, {
            lock: { mode: 'pessimistic_write' },
        });
        await app.get(OutboxService).pollOutboxes();
    });
    await app.get(OutboxService).pollOutboxes();
    await app.get(OutboxService).pollOutboxes();
    await other.close();
    await app.close();
})();
