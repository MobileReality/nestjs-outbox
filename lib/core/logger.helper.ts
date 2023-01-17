import pino from 'pino';

export const createLogger = (): pino.Logger => {
    return pino({
        nestedKey: 'data',
        serializers: {
            data(val) {
                if (val instanceof Error) {
                    return pino.stdSerializers.err(val);
                }
                ['err', 'error', 'e'].forEach((key) => {
                    if (val?.[key] instanceof Error) {
                        val[key] = pino.stdSerializers.err(val[key]);
                    }
                });
                return val;
            },
        },
    });
};
