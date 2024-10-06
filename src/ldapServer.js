//ldapServer.js

const ldap = require('ldapjs');
const { loadConfig } = require('./configManager');
const { log, handleLDAPError } = require('./utils/utils');
const { authenticateUser, findEntryByDn } = require('./handlers/userAuthentication');

class LDAPServer {
    constructor() {
        log('Initializing LDAP server', 'info');
        log('Loading configuration', 'info');
        const config = loadConfig();
        log(`Loaded configuration: ${JSON.stringify(config)}`, 'debug');

        this.ldapPort = config.port;
        this.ldapHostname = config.host;
        this.rootDN = config.rootDN;
        this.server = ldap.createServer();

        log(`LDAP server initialized with hostname: ${this.ldapHostname}, port: ${this.ldapPort}, rootDN: ${this.rootDN}`, 'info');
    }

    start() {
        log('Starting LDAP server...', 'info');
        this.server.listen(this.ldapPort, this.ldapHostname, () => {
            log(`LDAP server up at: ldap://${this.ldapHostname}:${this.ldapPort}`, 'info');
        });

        this.setupRoutes();
    }

    close() {
        return new Promise((resolve) => {
            log('Closing LDAP server...', 'info');
            this.server.close(() => {
                log('LDAP server closed', 'info');
                resolve();
            });
        });
    }

    setupRoutes() {
        log('Setting up LDAP routes...', 'info');
        this.server.bind(this.rootDN, (req, res, next) => this.handleBind(req, res, next));
        this.server.search(this.rootDN, (req, res, next) => this.handleSearch(req, res, next));
        log('Routes set up successfully', 'info');
    }

    async handleBind(req, res, next) {
        log(`Received bind request: DN=${req.dn.toString()}, Method=${req.authentication}`, 'debug');

        const dnString = req.dn.toString();

        let identifier; // Can be uid or cn
        let identifierType; // Tracks whether it is uid or cn

        // Try to match uid
        let matches = dnString.match(/uid=([^,]+)/i);
        if (matches) {
            identifier = matches[1];
            identifierType = 'uid';
        } else {
            // Try to match cn if uid not found
            matches = dnString.match(/cn=([^,]+)/i);
            if (matches) {
                identifier = matches[1];
                identifierType = 'cn';
            }
        }

        const password = req.credentials;

        log(`Parsed identifier from DN: ${identifierType ? `${identifierType}=${identifier}` : 'None found'}`, 'debug');

        if (identifier) {
            log(`Attempting to authenticate ${identifierType.toUpperCase()}: ${identifier}`, 'info');

            try {
                const user = await authenticateUser(identifier, password, identifierType);

                if (user) {
                    log(`Authentication successful for ${identifierType.toUpperCase()}: ${identifier}`, 'info');
                    res.end(); // Authentication success
                    return next();
                } else {
                    log(`Authentication failed for ${identifierType.toUpperCase()}: ${identifier}`, 'warn');
                    return next(new ldap.InvalidCredentialsError());
                }
            } catch (error) {
                log(`Bind error: ${error.message}`, 'error');
                return next(new ldap.OperationsError(error.message));
            }
        } else {
            log('Invalid DN format. No valid identifier found.', 'warn');
            return next(new ldap.InvalidDnError());
        }
    }

    async handleSearch(req, res, next) {
        log(`Search request received for base object: ${req.dn.toString()}, scope: ${req.scope}, filter: ${req.filter.toString()}`, 'debug');

        try {
            const results = await findEntryByDn(req.dn.toString(), req.filter, req.scope);
            log(`Search results count: ${results.length}`, 'debug');

            results.forEach((result, index) => {
                log(`Result ${index + 1}: DN=${result.dn}, Attributes=${JSON.stringify(result.attributes)}`, 'debug');
                res.send({
                    dn: result.dn,
                    attributes: result.attributes
                });
            });

            log('Search completed, sending response...', 'info');
            res.end(); // End the response after sending all entries
            return next(); // Continue to next middleware if any
        } catch (error) {
            log(`Search error: ${error.message}`, 'error');
            return next(new ldap.NoSuchObjectError(error.message));
        }
    }
}

module.exports = LDAPServer;

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise} reason: ${reason}`, 'error');
    process.exit(1);
});
