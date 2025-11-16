export default {
    /**
     * Path to the Database
     */
    DB_PATH: process.env.HD_HOMEY_DB_PATH || './data/db/hd_homey.db',

    /**
     * App will attempt to rewrite the lineup and other URLs to this proxy.
     * It will do so based on the request headers and such.
     * Sometime it cannot do that, in which case you might want to help it out with the correct value
     */
    PROXY_HOST: process.env.HD_HOMEY_PROXY_HOST || '',

    /**
     * The secret key to encrypt auth tokens with
     */
    AUTH_SECRET: process.env.AUTH_SECRET || '',
};
