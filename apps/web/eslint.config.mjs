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
        settings: {
            'import-x/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json',
                }
            }
        },
        rules: {
            // Disable false positive checks for Better-Auth session null checks
            '@typescript-eslint/no-unnecessary-condition': 'off',
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
            ],
            // Design system enforcement rules
            'no-restricted-syntax': [
                'error',
                // Prevent hardcoded hex colors
                {
                    selector: 'Literal[value=/#[0-9a-fA-F]{3,6}/]',
                    message: 'Use design system color variables (var(--color-*)) ' +
                        'instead of hardcoded hex colors'
                },
                // Prevent RGB/RGBA colors
                {
                    selector: 'Literal[value=/rgba?\\(/]',
                    message: 'Use design system color variables (var(--color-*)) ' +
                        'instead of RGB colors'
                },
                // Prevent CSS variable redeclaration as constants
                {
                    selector: 'VariableDeclarator[init.value=/^var\\(--/]',
                    message: 'Do not redeclare CSS variables as constants. ' +
                        'Use them directly in CSS modules or utility classes.'
                }
            ],
            // Allow CSS variable duplication - they should be used inline
            'sonarjs/no-duplicate-string': [
                'error',
                {
                    threshold: 3,
                    // Common CSS variables that are reused throughout components
                    ignoreStrings: 'var(--space-1),var(--space-2),var(--space-3),var(--space-4),var(--space-5),' +
                        'var(--color-primary),var(--color-secondary),var(--color-error),var(--color-success),' +
                        'var(--color-text-primary),var(--color-text-secondary),var(--color-border),' +
                        'var(--radius-sm),var(--radius-md),var(--radius-lg),' +
                        'var(--font-weight-medium),var(--font-size-xs)'
                }
            ]
        },
    },
    {
        ignores: [
            '.next/**/*',
            'data/**/*',
            'next-env.d.ts',
            // Docs directory has its own ESLint config
            'docs/**/*'
        ]
    },
    {
        // Node.js script files need node globals (process, console, etc.)
        files: ['src/scripts/*.mjs', 'src/scripts/*.js'],
        languageOptions: {
            globals: {
                // Node.js built-in globals for script files
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                URL: 'readonly',
            },
        },
        rules: {
            'no-console': 'off',
        },
    }
];
