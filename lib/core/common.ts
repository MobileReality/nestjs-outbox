import _ from 'lodash';

export interface RegisteredOutbox {
    allowInstant: boolean;
    name: string;
    grouping: string;
    // tag: string;
    handlerEnabled: boolean;
    sequential: boolean;
    originalThis: any;
    originalFunction: any;

    methodKey: string;
    instanceName: string;

    argumentCount: number;
}

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
