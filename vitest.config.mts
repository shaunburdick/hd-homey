import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**']
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@public': path.resolve(__dirname, './public'),
        },
    },
});
