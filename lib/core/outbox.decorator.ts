import { SetMetadata } from '@nestjs/common';

export const OUTBOX_DECORATOR_METADATA = 'OUTBOX_DECORATOR_METADATA';

export interface OutboxDecoratorMetadata {
    name: string;
    grouping?: string;
    sequential: boolean;
    enableHandler: boolean;
    allowInstant: boolean;
}

export interface OutboxDecoratorConfig {
    grouping?: string;
    sequential?: boolean;
    enableHandler?: boolean;
    allowInstant?: boolean;
}

type allowedDescriptors =
    | TypedPropertyDescriptor<(...p: any[]) => Promise<void>>
    | TypedPropertyDescriptor<(...p: any[]) => void>
    | TypedPropertyDescriptor<(...p: any[]) => Promise<string>>
    | TypedPropertyDescriptor<(...p: any[]) => string>
    | TypedPropertyDescriptor<(...p: any[]) => Promise<void | string>>
    | TypedPropertyDescriptor<(...p: any[]) => void | string>;
type outboxDecorator = <
    D extends allowedDescriptors,
    // T extends { [K in keyof T]: T[K] },
    // K extends T[K] extends (p: any, p2: string, p3: string) => any ? any : never,
>(
    target: any,
    propertyKey: string,
    descriptor: D,
) => D;

export function Outbox(name: string, config?: OutboxDecoratorConfig): outboxDecorator;
export function Outbox(name: string, enableHandler: boolean): outboxDecorator;

// eslint-disable-next-line func-style
export function Outbox(
    name: string,
    configOrBool?: OutboxDecoratorConfig | boolean,
): outboxDecorator {
    const config =
        typeof configOrBool === 'boolean' ? { enableHandler: configOrBool } : configOrBool;
    return SetMetadata(OUTBOX_DECORATOR_METADATA, {
        name,
        grouping: config?.grouping,
        sequential: Boolean(config?.sequential),
        enableHandler: Boolean(config?.enableHandler),
        allowInstant: Boolean(config?.allowInstant),
    });
}
