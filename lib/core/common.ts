import _ from 'lodash';

export type RegisteredOutboxHandler = {
    type: 'handler';
    allowInstant: boolean;
    instantBypass: boolean;
    name: string;
    grouping: string;
    // tag: string;
    handlerEnabled: boolean;
    sequential: boolean;
    delay: number;

    originalThis?: any;
    originalFunction: any;

    argumentCount: number;
    transactionParamPos: number;
};

export type RegisteredOutboxMethod = Omit<RegisteredOutboxHandler, 'type'> & {
    type: 'method';
    methodKey: string;
    instanceName: string;
};

export type RegisteredOutbox = RegisteredOutboxHandler | RegisteredOutboxMethod;

export const isSerializable = (obj: any) => {
    if (
        obj === null ||
        obj === undefined ||
        typeof obj === 'string' ||
        typeof obj === 'boolean' ||
        typeof obj === 'number'
    ) {
        return true;
    }

    if (!_.isPlainObject(obj) && !_.isArray(obj)) {
        return false;
    }

    for (const key in obj) {
        if (!isSerializable(obj[key])) {
            return false;
        }
    }

    return true;
};
