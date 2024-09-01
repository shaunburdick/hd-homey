import Config from '@/config';
import Logger from '@/logger';

export async function register() {
    Logger.info('Starting App with the following config: %o', Config);

    if (!URL.canParse(Config.TUNER_PATH)) {
        throw new Error('Unable to parse tuner path, be sure to set HD_HOMEY_TUNER_PATH');
    }
}
