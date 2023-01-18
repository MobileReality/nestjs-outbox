import { OutboxEntity } from '../engines/typeorm/outbox.entity';
import type { OutboxDecoratorMetadata } from '../core/outbox.decorator';
import { OUTBOX_DECORATOR_METADATA } from '../core/outbox.decorator';

// eslint-disable-next-line func-style
export function getCallerOutboxInfo(argsInput?: IArguments | any[]) {
    // noinspection CallerJS  TODO: this doesn't work in strict mode anyway
    const args = argsInput ?? getCallerOutboxInfo.caller.arguments;

    const lastArgument = args.length > 0 ? args[args.length - 1] : null;
    return lastArgument instanceof OutboxEntity ? lastArgument : null;
}

// eslint-disable-next-line func-style
export function setManualOutboxConfig<T, M extends keyof T>(
    object: T,
    // TODO restrict M to methods?  & ((...params: any) => any)
    methodName: M,
    config: Partial<OutboxDecoratorMetadata> & { name: string },
) {
    Reflect.defineMetadata(
        OUTBOX_DECORATOR_METADATA,
        {
            sequential: false,
            enableHandler: true,
            allowInstant: false,
            instantBypass: false,
            ...config,
        },
        object[methodName],
    );
}
