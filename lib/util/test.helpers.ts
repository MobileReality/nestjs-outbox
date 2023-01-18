import type { RegisteredOutbox, RegisteredOutboxMethod } from '../core/common';
import SpyInstance = jest.SpyInstance;

export const spyOnOutbox = <T extends (...params: any) => any>(method: T, bypassOutbox = false) => {
    const registration = (method as any).outbox as RegisteredOutboxMethod;
    // TODO add test for bypass
    if (bypassOutbox) {
        return jest
            .spyOn(registration.originalThis, registration.methodKey)
            .mockImplementation((...args) =>
                registration.originalFunction.apply(registration.originalThis, args),
            ) as SpyInstance<ReturnType<T>, Parameters<T>>;
    }
    return jest.spyOn(
        (method as any).outbox as RegisteredOutboxMethod,
        'originalFunction',
    ) as SpyInstance<ReturnType<T>, Parameters<T>>;
};

export type SaveOutboxSpyType<T = any> = SpyInstance<
    Promise<void>,
    [transactionObject: T, outbox: RegisteredOutbox, ...args: any[]]
>;
