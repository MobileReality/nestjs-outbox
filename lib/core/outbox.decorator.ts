import { SetMetadata } from '@nestjs/common';
import { isFunction } from 'lodash';

export const OUTBOX_DECORATOR_METADATA = 'OUTBOX_DECORATOR_METADATA';
export const MANUAL_OUTBOX_DECORATOR_METADATA_GUARD = '::OUTBOX_DECORATOR_METADATA_GUARD';

export interface OutboxDecoratorMetadata {
    name: string;
    grouping?: string;
    sequential: boolean;
    enableHandler: boolean;
    delay: number;
    allowInstant: boolean;
    instantBypass: boolean;
}
export type OutboxDecoratorMetadataType = OutboxDecoratorMetadata | (() => OutboxDecoratorMetadata);

export interface OutboxHandlerDecoratorConfig {
    grouping?: string;
    /**
     * default false
     */
    sequential?: boolean;
    /**
     * default true
     */
    enableHandler?: boolean;
    /**
     * delay time in seconds
     * default 0
     */
    delay?: number;
}
export type OutboxHandlerDecoratorConfigType =
    | OutboxHandlerDecoratorConfig
    | (() => OutboxHandlerDecoratorConfig);

export interface OutboxDecoratorConfig extends OutboxHandlerDecoratorConfig {
    /**
     * default false
     */
    allowInstant?: boolean;
    /**
     * default false
     */
    instantBypass?: boolean;
}
export type OutboxDecoratorConfigType = OutboxDecoratorConfig | (() => OutboxDecoratorConfig);

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

export function Outbox(
    name: string | (() => string),
    config?: OutboxDecoratorConfigType,
): outboxDecorator;
export function Outbox(name: string | (() => string), enableHandler: boolean): outboxDecorator;

// eslint-disable-next-line func-style
export function Outbox(
    name: string | (() => string),
    configOrBool?: OutboxDecoratorConfigType | boolean,
): outboxDecorator {
    // TODO check if metadata not already set?
    const config =
        typeof configOrBool === 'boolean' ? { enableHandler: configOrBool } : configOrBool;
    const decoratorMeta: OutboxDecoratorMetadataType =
        !isFunction(name) && !isFunction(config)
            ? {
                  name,
                  grouping: config?.grouping,
                  sequential: Boolean(config?.sequential),
                  enableHandler: Boolean(config?.enableHandler ?? true),
                  allowInstant: Boolean(config?.allowInstant),
                  instantBypass: Boolean(config?.instantBypass),
                  delay: config?.delay ?? 0,
              }
            : function f(this: any) {
                  const resolvedName = isFunction(name) ? name.apply(this) : name;
                  const resolvedConfig = isFunction(config) ? config.apply(this) : config;

                  return {
                      name: resolvedName,
                      grouping: resolvedConfig?.grouping,
                      sequential: Boolean(resolvedConfig?.sequential),
                      enableHandler: Boolean(resolvedConfig?.enableHandler ?? true),
                      allowInstant: Boolean(resolvedConfig?.allowInstant),
                      instantBypass: Boolean(resolvedConfig?.instantBypass),
                      delay: resolvedConfig?.delay ?? 0,
                  };
              };
    return SetMetadata(OUTBOX_DECORATOR_METADATA, decoratorMeta);
}
export const ManualOutbox = () =>
    SetMetadata(OUTBOX_DECORATOR_METADATA, MANUAL_OUTBOX_DECORATOR_METADATA_GUARD);

export function OutboxHandler(
    name: string | (() => string),
    config?: OutboxHandlerDecoratorConfigType,
): outboxDecorator;
export function OutboxHandler(
    name: string | (() => string),
    enableHandler: boolean,
): outboxDecorator;

// eslint-disable-next-line func-style
export function OutboxHandler(
    name: string | (() => string),
    configOrBool?: OutboxHandlerDecoratorConfigType | boolean,
): outboxDecorator {
    // TODO check if metadata not already set?
    const config =
        typeof configOrBool === 'boolean' ? { enableHandler: configOrBool } : configOrBool;
    const decoratorMeta: OutboxDecoratorMetadataType =
        !isFunction(name) && !isFunction(config)
            ? {
                  name,
                  grouping: config?.grouping,
                  sequential: Boolean(config?.sequential),
                  enableHandler: Boolean(config?.enableHandler ?? true),
                  delay: config?.delay ?? 0,
                  allowInstant: false, // TODO junk
                  instantBypass: false,
              }
            : function f(this: any) {
                  const resolvedName = isFunction(name) ? name.apply(this) : name;
                  const resolvedConfig = isFunction(config) ? config.apply(this) : config;

                  return {
                      name: resolvedName,
                      grouping: resolvedConfig?.grouping,
                      sequential: Boolean(resolvedConfig?.sequential),
                      enableHandler: Boolean(resolvedConfig?.enableHandler ?? true),
                      delay: resolvedConfig?.delay ?? 0,
                      allowInstant: false, // TODO junk
                      instantBypass: false,
                  };
              };
    return SetMetadata(OUTBOX_DECORATOR_METADATA, decoratorMeta);
}
