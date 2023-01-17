module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'subject-case': [
            0,
            'always',
            [
                'lower-case', // default
                'upper-case', // UPPERCASE
                'camel-case', // camelCase
                'kebab-case', // kebab-case
                'pascal-case', // PascalCase
                'sentence-case', // Sentence case
                'snake-case', // snake_case
                'start-case', // Start Case
            ],
        ],
    },
};
