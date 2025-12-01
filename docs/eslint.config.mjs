// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['.vitepress/**/*.ts', '.vitepress/**/*.vue'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            // Allow unused vars prefixed with underscore
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            // Allow any types in config files (they're simple)
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        ignores: [
            '.vitepress/cache/**/*',
            '.vitepress/dist/**/*',
            'node_modules/**/*',
        ],
    }
);
