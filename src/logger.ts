import type { LoggerOptions } from 'pino';
import pino from 'pino';

const pinoConfig: LoggerOptions = {
    name: 'hd-homey',
    browser: {
        asObject: true
    }
};

const logger = pino(pinoConfig);

export default logger;
