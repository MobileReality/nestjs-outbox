export const OUTBOX_TRANSACTION_PARAM = 'OUTBOX_TRANSACTION_PARAM';

export type TransactionParamType = { parameterIndex: number };

// eslint-disable-next-line func-style
export function TransactionParam(target: any, methodKey: string, parameterIndex: number) {
    console.log('PREV', Reflect.getMetadata(OUTBOX_TRANSACTION_PARAM, target[methodKey]));
    const value: TransactionParamType = { parameterIndex };
    Reflect.defineMetadata(OUTBOX_TRANSACTION_PARAM, value, target[methodKey]);
}
