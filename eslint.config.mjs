import shaunburdick from 'eslint-config-shaunburdick';
// eslint-disable-next-line import/no-extraneous-dependencies -- Provided by eslint-config-next
import nextPlugin from '@next/eslint-plugin-next';

export default [
    ...shaunburdick.config.js,
    ...shaunburdick.config.ts,
    ...shaunburdick.config.react,
    {
        name: 'next.js',
        plugins: {
            '@next/next': nextPlugin
        },
        rules: {
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs['core-web-vitals'].rules,
        }
    },
    {
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json',
                }
            }
        },
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
            '.next/**/*',
            'data/**/*'
        ]
    }
];
