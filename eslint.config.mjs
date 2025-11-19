import shaunburdick from 'eslint-config-shaunburdick';
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
        name: 'eslint-config',
        files: ['eslint.config.mjs'],
        rules: {
            'import/no-extraneous-dependencies': 'off'
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
