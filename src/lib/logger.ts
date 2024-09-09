import type { LoggerOptions } from 'pino';
import pino from 'pino';

const pinoConfig: LoggerOptions = {
    name: 'hd-homey',
    base: undefined,
    browser: {
        asObject: true
    },
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
};

const logger = pino(pinoConfig);

export default logger;
