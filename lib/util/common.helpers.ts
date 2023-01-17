import { OutboxEntity } from '../engines/typeorm/outbox.entity';

// eslint-disable-next-line func-style
export function getCallerOutboxInfo(argsInput?: IArguments | any[]) {
    // noinspection CallerJS  TODO: this doesn't work in strict mode anyway
    const args = argsInput ?? getCallerOutboxInfo.caller.arguments;

    const lastArgument = args.length > 0 ? args[args.length - 1] : null;
    return lastArgument instanceof OutboxEntity ? lastArgument : null;
}
