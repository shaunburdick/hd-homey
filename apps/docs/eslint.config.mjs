// @ts-check
import shaunburdick from 'eslint-config-shaunburdick';

export default [
    ...shaunburdick.config.js,
    ...shaunburdick.config.ts,
    {
        name: 'docs/vitepress-overrides',
        files: ['.vitepress/**/*.ts', '.vitepress/**/*.vue'],
        rules: {
            // Allow unused vars prefixed with underscore
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            // Allow any types in config files (they're simple and VitePress-specific)
            '@typescript-eslint/no-explicit-any': 'off',
            // VitePress uses path strings like '/getting-started/' as object keys in config
            '@typescript-eslint/naming-convention': 'off',
            // VitePress module resolution handled by build system
            'import-x/no-unresolved': ['error', { ignore: ['^vitepress'] }],
        },
    },
    {
        ignores: [
            '.vitepress/cache/**/*',
            '.vitepress/dist/**/*',
            'node_modules/**/*',
        ],
    }
];
