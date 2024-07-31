// utils.js
const { loadConfig } = require('../configManager');

const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

function log(message, level = 'debug') {
    const config = loadConfig();
    const currentLogLevel = logLevels[config.logLevel || 'debug'];
    const messageLogLevel = logLevels[level];

    if (messageLogLevel <= currentLogLevel) {
        console.log(`[${level.toUpperCase()}] ${message}`);
    }
}

function handleLDAPError(err, req, res, next) {
    log(`LDAP error encountered: ${err}`, 'error');
    return next(new Error(err));
}

module.exports = {
    log,
    handleLDAPError
};