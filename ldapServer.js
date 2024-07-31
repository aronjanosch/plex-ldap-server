const ldap = require('ldapjs');
const { loadConfig } = require('./configManager');
const { log, handleLDAPError } = require('./utils');
const { authenticateUser, findUserByDn } = require('./userAuthentication'); // Assuming user authentication methods are defined here

class LDAPServer {
    constructor() {
        const config = loadConfig();
        this.ldapPort = config.port;
        this.ldapHostname = config.host;
        this.rootDN = config.rootDN;
        this.server = ldap.createServer();
    }

    start() {
        this.server.listen(this.ldapPort, this.ldapHostname, () => {
            log(`LDAP for Plex server up at: ldap://${this.ldapHostname}:${this.ldapPort}`);
        });

        this.setupRoutes();
    }

    setupRoutes() {
        this.server.bind(this.rootDN, (req, res, next) => this.handleBind(req, res, next));
        this.server.search(this.rootDN, (req, res, next) => this.handleSearch(req, res, next));
    }

    async handleBind(req, res, next) {
        const username = req.dn.toString(); // Extract username from DN
        const password = req.credentials;
        log(`Bind request for DN: ${username}`);

        try {
            const user = await authenticateUser(username, password);
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
    }

    async handleSearch(req, res, next) {
        log(`Search request for base object: ${req.dn.toString()}, scope: ${req.scope}, filter: ${req.filter.toString()}`);

        try {
            const results = await findUserByDn(req.dn.toString(), req.filter);
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
