import '../../../utils/app-creator';
import { INestApplicationContext } from '@nestjs/common';
import { OutboxPersistenceEngine } from '../../../../lib/engines/engine.service';
import { Connection, createConnection } from 'typeorm';
import { TestService } from '../../../generic/test.service';
import { SaveOutboxSpyType, spyOnOutbox } from '../../../../lib/util/test.helpers';
import { OutboxService } from '../../../../lib/core/outbox.service';
import { OutboxEntity } from '../../../../lib/engines/typeorm/outbox.entity';

describe('Test', () => {
    let app: INestApplicationContext;
    let saveOutboxSpy: SaveOutboxSpyType;
    let testService: TestService;
    let connection: Connection;
    let otherConnection: Connection;
    beforeEach(async () => {
        app = await global.createTestApp({ autostartPolling: false });
        testService = app.get(TestService);
        saveOutboxSpy = jest.spyOn(app.get(OutboxPersistenceEngine), 'saveOutboxCall');
        await app.init();
        connection = app.get(Connection);
        otherConnection = await createConnection({ ...connection.options, name: 'other' });
    });
    afterEach(async () => {
        await otherConnection.close();
        await app.close();
    });

    it('Should fail instantly when locked [SEQUENTIAL]', async () => {
        const testSpy = spyOnOutbox(testService.test).mockResolvedValue();
        await connection.transaction(async (manager) => {
            await expect(testService.test(0, null, manager)).resolves.not.toThrow();
        });
        await otherConnection.transaction(async (manager) => {
            await manager.find(OutboxEntity, {
                lock: { mode: 'pessimistic_write' },
            });
            await app.get(OutboxService).pollOutboxes();
        });
        expect(testSpy).toHaveBeenCalledTimes(0);
        await app.get(OutboxService).pollOutboxes();
        expect(testSpy).toHaveBeenCalledTimes(1);
    });
});
