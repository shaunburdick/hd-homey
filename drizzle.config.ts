import { defineConfig } from 'drizzle-kit';
import Config from '@/lib/config';

export default defineConfig({
    schema: './src/lib/database/schema.ts',
    out: './migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: Config.DB_PATH
    }
});
