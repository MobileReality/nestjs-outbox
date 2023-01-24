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

    it('Should resolve dynamic config', async () => {
        const testSpy = spyOnOutbox(testService.testDynamic);
        await expect(testService.testDynamic()).resolves.not.toThrow();
        expect(testSpy).toHaveBeenCalledTimes(1);
        expect(testSpy).toHaveBeenCalledWith(null);
        const outbox = (testService.testDynamic as any).outbox as RegisteredOutbox;
        expect(outbox).toBeDefined();
        expect(outbox.name).toStrictEqual(`dynamic${testService.random}`);
        // TODO dynamic config object
    });

    // TODO different test suite
    it('Should set outbox metadata manually', async () => {
        const testSpy = spyOnOutbox(testService.testManual);
        await expect(testService.testManual()).resolves.not.toThrow();
        expect(testSpy).toHaveBeenCalledTimes(1);
        expect(testSpy).toHaveBeenCalledWith(null);
        const outbox = (testService.testManual as any).outbox as RegisteredOutbox;
        expect(outbox).toBeDefined();
        expect(outbox.name).toStrictEqual('manually');
    });
});
