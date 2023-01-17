import { INestApplicationContext } from '@nestjs/common';

export type CreateAppOptions = {
    autostartPolling?: boolean;
    appendOutboxInfo?: boolean;
    transactionResolver?: () => any;
};

declare global {
    // eslint-disable-next-line no-var,vars-on-top
    var db_type: string;
    function createTestApp(options?: CreateAppOptions): Promise<INestApplicationContext>;
}
