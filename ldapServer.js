const ldap = require('ldapjs');
const { loadConfig } = require('./configManager');
const { log, handleLDAPError } = require('./utils');
const { authenticateUser, findEntryByDn } = require('./userAuthentication');

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
        log('DN:', req.dn.toString(), 'info');
        const dnString = req.dn.toString();
        const matches = dnString.match(/cn=([^,]+)/i);
        const cn = matches ? matches[1] : null;
        const password = req.credentials;

        if (cn) {
            log(`Bind request for CN: ${cn}`, 'info');

            try {
                const user = await authenticateUser(cn, password);
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
            log('Invalid DN format. CN not found.');
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