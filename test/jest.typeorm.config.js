const baseConfig = require('./jest.config');

module.exports = {
    ...baseConfig,
    testMatch: [...baseConfig.testMatch, '<rootDir>/engine/typeorm/**/*.test.ts'],
    globals: {
        engine: 'typeorm',
        db_type: process.env.DB_TYPE,
    },
    setupFilesAfterEnv: ['<rootDir>/engine/typeorm/app.ts'],
};
