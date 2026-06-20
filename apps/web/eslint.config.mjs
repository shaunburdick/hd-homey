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
            'coverage/**/*',
            'data/**/*',
            'next-env.d.ts',
            // Docs directory has its own ESLint config
            'docs/**/*'
        ]
    },
    {
        // CRC32 requires bitwise operations by algorithm definition.
        // The IEEE 802.3 polynomial table construction and the running
        // CRC accumulation both rely on XOR, AND, and right-shift — there
        // is no way to implement this algorithm without bitwise operators.
        // Magic numbers in this file are the standard CRC32 algorithm constants
        // (polynomial, iteration count, mask values) documented by the IEEE spec.
        files: ['src/lib/hdhr/crc32.ts'],
        rules: {
            'no-bitwise': 'off',
            'no-magic-numbers': 'off',
        },
    },
    {
        // The HDHomeRun native TCP protocol (port 65001) uses a TLV (tag-length-value)
        // binary framing format that inherently requires bitwise operations to encode
        // and decode variable-length fields, CRC computation, and protocol constants.
        // The magic numbers in this file are all protocol wire-format constants
        // defined in the libhdhomerun C header (hdhomerun_pkt.h).
        files: ['src/lib/hdhr/native-protocol.ts'],
        rules: {
            'no-bitwise': 'off',
            'no-magic-numbers': 'off',
        },
    },
    {
        // Test helpers for native-protocol.test.ts must replicate TLV binary packet
        // construction to build realistic mock device responses. This requires the
        // same bitwise operations and protocol constants as the production code.
        // Limiting to the test file prevents pollution of other test files.
        files: ['src/lib/hdhr/native-protocol.test.ts'],
        rules: {
            'no-bitwise': 'off',
            'no-magic-numbers': 'off',
        },
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
