export default {
    /**
     * Path to the Database
     */
    DB_PATH: process.env.HD_HOMEY_DB_PATH || './db/hd_homey.db',

    /**
     * App will attempt to rewrite the lineup and other URLs to this proxy.
     * It will do so based on the request headers and such.
     * Sometime it cannot do that, in which case you might want to help it out with the correct value
     */
    PROXY_HOST: process.env.HD_HOMEY_PROXY_HOST || '',

    /**
     * URL for the tuner
     */
    TUNER_PATH: process.env.HD_HOMEY_TUNER_PATH || '',
};
