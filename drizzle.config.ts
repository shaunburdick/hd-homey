import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/lib/database/schema.ts',
    out: './migrations',
    dialect: 'sqlite', // 'postgresql' | 'mysql' | 'sqlite'
});
