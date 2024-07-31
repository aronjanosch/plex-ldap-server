// tests/ldapServer.test.js

const ldap = require('ldapjs');
const LDAPServer = require('../ldapServer');
const { loadConfig } = require('../configManager');

describe('LDAPServer Integration Tests', () => {
    let ldapServer;
    let ldapClient;

    beforeAll(async () => {
        ldapServer = new LDAPServer();
        await ldapServer.start();
    });

    afterAll(async () => {
        await ldapServer.close();
    });

    beforeEach(() => {
        ldapClient = ldap.createClient({
            url: `ldap://${loadConfig().host}:${loadConfig().port}`
        });
    });

    afterEach((done) => {
        ldapClient.unbind(() => {
            ldapClient = null;
            done();
        });
    });

    test('LDAP server processes bind requests correctly', async () => {
        const username = process.env.TEST_USERNAME || ''; // Adjust as per your test user
        const password = process.env.TEST_PASSWORD || ''; // Adjust as per your test user's password

        await new Promise((resolve, reject) => {
            ldapClient.bind(username, password, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });

    test('LDAP server processes search requests correctly', (done) => {
        const baseDN = 'ou=users, o=plex.tv'; // Adjust as per your test base DN
        const filter = '(objectclass=*)'; // Adjust as per your test filter

        ldapClient.search(baseDN, {
            scope: 'sub',
            filter
        }, (err, res) => {
            expect(err).toBeNull();
            res.on('searchEntry', (entry) => {
                // Process each search result entry
                expect(entry).toBeDefined();
            });
            res.on('error', (error) => {
                expect(error).toBeUndefined();
            });
            res.on('end', () => {
                // Search completed
                done();
            });
        });
    });
});