import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { getCallerOutboxInfo, ManualOutbox, Outbox, setManualOutboxConfig } from '../../lib';

@Injectable()
export class TestService {
    public readonly random: number = Math.random() * 100;
    constructor() {
        setManualOutboxConfig(this, 'testManual', { name: 'manually', allowInstant: true });
    }

    @Outbox('tester', { enableHandler: true, sequential: false })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async test(n: number, something?: any, manager?: EntityManager): Promise<void | string> {
        console.log('target', n, something);
        // eslint-disable-next-line prefer-rest-params
        console.log('outbox', getCallerOutboxInfo(arguments));
    }

    @Outbox('tester2', { allowInstant: true })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async testInstant(n: number, something?: any, manager?: EntityManager): Promise<void | string> {
        console.log('target', n, something);
    }

    @Outbox(
        function name(this: TestService) {
            return `dynamic${this.random}`;
        },
        { allowInstant: true },
    )
    async testDynamic(manager?: EntityManager) {
        //
    }

    @ManualOutbox()
    async testManual(manager?: EntityManager) {
        //
    }
}
