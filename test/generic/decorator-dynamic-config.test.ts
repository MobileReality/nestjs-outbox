import '../utils/app-creator';
import 'jest-extended';
import { TestService } from './test.service';
import type { INestApplicationContext } from '@nestjs/common';
import { OutboxPersistenceEngine } from '../../lib/engines/engine.service';
import { spyOnOutbox } from '../../lib';
import { RegisteredOutbox } from '../../lib/core/common';

describe('Test decorator dynamic config', () => {
    let app: INestApplicationContext;
    let testService: TestService;
    let saveOutboxSpy: jest.SpyInstance;
    beforeEach(async () => {
        app = await global.createTestApp();
        testService = app.get(TestService);
        saveOutboxSpy = jest
            .spyOn(app.get(OutboxPersistenceEngine), 'saveOutboxCall')
            .mockResolvedValue();
        await app.init();
    });
    afterEach(async () => {
        await app.close();
    });

    it('Should pass instant when allowed', async () => {
        const testSpy = spyOnOutbox(testService.testDynamic);
        await expect(testService.testDynamic()).resolves.not.toThrow();
        expect(testSpy).toHaveBeenCalledTimes(1);
        expect(testSpy).toHaveBeenCalledWith();
        const outbox = (testService.testDynamic as any).outbox as RegisteredOutbox;
        expect(outbox).toBeDefined();
        expect(outbox.name).toStrictEqual(`dynamic${testService.random}`);
    });
});
