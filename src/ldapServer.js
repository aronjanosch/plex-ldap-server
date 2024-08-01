const ldap = require('ldapjs');
const { loadConfig } = require('./configManager');
const { log, handleLDAPError } = require('./utils/utils');
const { authenticateUser, findEntryByDn } = require('./handlers/userAuthentication');

class LDAPServer {
    constructor() {
        log('Initializing LDAP server', 'info');
        log('Loading configuration', 'info');
        const config = loadConfig();
        this.ldapPort = config.port;
        this.ldapHostname = config.host;
        this.rootDN = config.rootDN;
        this.server = ldap.createServer();
    }

    start() {
        this.server.listen(this.ldapPort, this.ldapHostname, () => {
            log(`LDAP for Plex server up at: ldap://${this.ldapHostname}:${this.ldapPort}`, 'info');
        });

        this.setupRoutes();
    }

    close() {
        return new Promise((resolve) => {
            this.server.close(() => {
                log('LDAP server closed', 'info');
                resolve();
            });
        });
    }

    setupRoutes() {
        this.server.bind(this.rootDN, (req, res, next) => this.handleBind(req, res, next));
        this.server.search(this.rootDN, (req, res, next) => this.handleSearch(req, res, next));
    }

    async handleBind(req, res, next) {
        log('DN: ' + req.dn.toString(), 'info');
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

        if (identifier) {
            log(`Bind request for ${identifierType.toUpperCase()}: ${identifier}`, 'info');

            try {
                const user = await authenticateUser(identifier, password, identifierType);
                if (user) {
                    res.end(); // Authentication success
                    return next();
                } else {
                    return next(new ldap.InvalidCredentialsError());
                }
            } catch (error) {
                log(`Bind error: ${error.message}`);
                return next(new ldap.OperationsError(error.message));
            }
        } else {
            log('Invalid DN format. No valid identifier found.');
            return next(new ldap.InvalidDnError());
        }
    }

    async handleSearch(req, res, next) {
        log(`Search request for base object: ${req.dn.toString()}, scope: ${req.scope}, filter: ${req.filter.toString()}`, 'info');

        try {
            const results = await findEntryByDn(req.dn.toString(), req.filter.toString(), req.scope);
            results.forEach(result => {
                res.send({
                    dn: result.dn,
                    attributes: result.attributes
                });
            });

            res.end(); // End the response after sending all entries
            return next(); // Continue to next middleware if any
        } catch (error) {
            log(`Search error: ${error.message}`);
            return next(new ldap.NoSuchObjectError(error.message));
        }
    }
}

module.exports = LDAPServer;

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    log('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});