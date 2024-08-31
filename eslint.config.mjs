import shaunburdick from 'eslint-config-shaunburdick';

export default [
    ...shaunburdick.config.js,
    ...shaunburdick.config.ts,
    ...shaunburdick.config.react,
    {
        rules: {
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    // Allow PascalCase on default imports
                    selector: 'import',
                    format: ['camelCase', 'PascalCase'],
                },
                {
                    // Allow UPPER_CASE for Next's HTTP Verb functions
                    selector: 'function',
                    format: ['UPPER_CASE'],
                    'filter': {
                        'regex': '^GET|HEAD|POST|PUT|DELETE|PATCH|OPTIONS$',
                        'match': true
                    }
                }
            ]
        },
    },
    {
        ignores: [
            '.next/**/*'
        ]
    }
];
