import type { LoggerOptions } from 'pino';
import pino from 'pino';

const pinoConfig: LoggerOptions = {
    name: 'hd-homey',
    base: undefined,
    browser: {
        asObject: true
    }
};

// Only use pino-pretty in development
// In production (standalone mode), use default JSON output
if (process.env.NODE_ENV !== 'production') {
    pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    };
}

const logger = pino(pinoConfig);

export default logger;
