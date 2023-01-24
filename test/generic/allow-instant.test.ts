import '../utils/app-creator';
import 'jest-extended';
import { TestService } from './test.service';
import type { INestApplicationContext } from '@nestjs/common';
import { OutboxPersistenceEngine } from '../../lib/engines/engine.service';
import { spyOnOutbox } from '../../lib';

describe('Test allowInstant for PARAM', () => {
    let app: INestApplicationContext;
    let testService: TestService;
    let saveOutboxSpy;
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
        const testSpy = spyOnOutbox(testService.testInstant, true);
        await expect(testService.testInstant(0)).resolves.not.toThrow();
        expect(testSpy).toHaveBeenCalledTimes(1);
        expect(testSpy).toHaveBeenCalledWith(0);
    });
    it('Should pass instant bypass when allowed', async () => {
        const testSpy = spyOnOutbox(testService.testBypass);
        await expect(testService.testBypass(0)).resolves.not.toThrow();
        expect(testSpy).toHaveBeenCalledTimes(1);
        expect(testSpy).toHaveBeenCalledWith(0, undefined, null);
    });
    it('Should fail instant without transaction', async () => {
        await expect(testService.test(0)).rejects.toThrowError(/allowInstant/);
    });
});

describe('Test allowInstant for RESOLVER', () => {
    let app: INestApplicationContext;
    let testService: TestService;
    let transaction: any;
    let saveOutboxSpy;
    beforeEach(async () => {
        transaction = null;
        app = await global.createTestApp({
            autostartPolling: true,
            transactionResolver: () => transaction,
        });
        testService = app.get(TestService);
        saveOutboxSpy = jest.spyOn(app.get(OutboxPersistenceEngine), 'saveOutboxCall');
        await app.init();
    });
    afterEach(async () => {
        await app.close();
    });

    it('Should pass instant when allowed', async () => {
        const testSpy = spyOnOutbox(testService.testInstant, true);
        await expect(testService.testInstant(0)).resolves.not.toThrow();
        expect(testSpy).toHaveBeenCalledTimes(1);
        expect(testSpy).toHaveBeenCalledWith(0);
    });
    it('Should pass instant bypass when allowed', async () => {
        const testSpy = spyOnOutbox(testService.testBypass);
        await expect(testService.testBypass(0)).resolves.not.toThrow();
        expect(testSpy).toHaveBeenCalledTimes(1);
        expect(testSpy).toHaveBeenCalledWith(0);
    });
    it('Should fail instant without transaction', async () => {
        await expect(testService.test(0)).rejects.toThrowError(/allowInstant/);
    });
});
