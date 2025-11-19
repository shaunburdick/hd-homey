import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.next/**',
            '**/coverage/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**']
        },
        setupFiles: ['./vitest.setup.ts']
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@public': path.resolve(__dirname, './public'),
        },
    },
});
