import '../utils/app-creator';
import 'jest-extended';
import { INestApplicationContext } from '@nestjs/common';
import { TestService } from './test.service';
import { OutboxPersistenceEngine } from '../../lib/engines/engine.service';
import { spyOnOutbox } from '../../lib/util/test.helpers';
import { OutboxService } from '../../lib/core/outbox.service';
import { Connection } from 'typeorm';
import { OutboxEntity } from '../../lib/engines/typeorm/outbox.entity';

describe('Test appendOutboxInfo', () => {
    let app: INestApplicationContext;
    let testService: TestService;
    let saveOutboxSpy;
    beforeEach(async () => {
        app = await global.createTestApp({ autostartPolling: false, appendOutboxInfo: true });
        testService = app.get(TestService);
        saveOutboxSpy = jest.spyOn(app.get(OutboxPersistenceEngine), 'saveOutboxCall');
        await app.init();
    });
    afterEach(async () => {
        await app.close();
    });

    it('Should append false for instant', async () => {
        const testSpy = spyOnOutbox(testService.testInstant);
        await expect(testService.testInstant(0)).resolves.not.toThrow();
        expect(testSpy).toHaveBeenCalledTimes(1);
        expect(testSpy).toHaveBeenCalledWith(0, undefined, undefined, false);
    });
    it('Should append false for non-instant', async () => {
        const testSpy = spyOnOutbox(testService.test).mockResolvedValue();
        await app.get(Connection).transaction(async (manager) => {
            await expect(testService.test(0, {}, manager)).resolves.not.toThrow();
        });
        await app.get(OutboxService).pollOutboxes();
        await app.get(OutboxService).pollOutboxes();
        expect(testSpy).toHaveBeenCalledTimes(1);
        expect(testSpy).toHaveBeenCalledWith(0, {}, undefined, expect.any(OutboxEntity));
    });
});
