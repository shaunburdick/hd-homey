import pino from 'pino';

const logger = pino({
    name: 'hd-homey',
    level: 'info'
});

export default logger;
