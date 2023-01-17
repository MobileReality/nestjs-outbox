import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Outbox } from '../../lib/core/outbox.decorator';
import { getCallerOutboxInfo } from '../../lib/util/common.helpers';

@Injectable()
export class TestService {
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
}
