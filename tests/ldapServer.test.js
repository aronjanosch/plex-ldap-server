// tests/ldapServer.test.js

const ldap = require('ldapjs');
const LDAPServer = require('../src/ldapServer');
const { loadConfig } = require('../src/configManager');

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

    test('LDAP server processes search requests correctly for all users', (done) => {
        const baseDN = 'ou=users, o=plex.tv';
        const filter = '(objectclass=Plex.tv User)';

        ldapClient.search(baseDN, {
            scope: 'sub',
            filter
        }, (err, res) => {
            expect(err).toBeNull();

            let numEntries = 0;
            res.on('searchEntry', (entry) => {
                numEntries++;
                expect(entry).toBeDefined();
                expect(Array.isArray(entry.attributes)).toBe(true);
            });

            res.on('error', (error) => {
                expect(error).toBeUndefined();
            });

            res.on('end', () => {
                expect(numEntries).toBeGreaterThan(0); // At least one user must be present
                done();
            });
        });
    });

    test('LDAP server processes search requests correctly with a specific user filter', (done) => {
        const baseDN = 'ou=users, o=plex.tv';
        const username = 'elesteamail@gmail.com'; // Adjust as per your test user
        const filter = `(&(|(objectClass=Plex.tv User))(|(uid=${username})(mail=${username})(cn=${username})(displayName=${username})))`;

        ldapClient.search(baseDN, {
            scope: 'sub',
            filter
        }, (err, res) => {
            expect(err).toBeNull();

            let numEntries = 0;
            res.on('searchEntry', (entry) => {
                numEntries++;
                expect(entry).toBeDefined();
                expect(Array.isArray(entry.attributes)).toBe(true);

                const cnAttribute = entry.attributes.find(attr => attr.type.toLowerCase() === 'cn');
                const mailAttribute = entry.attributes.find(attr => attr.type.toLowerCase() === 'mail');
                const uidAttribute = entry.attributes.find(attr => attr.type.toLowerCase() === 'uid');

                // Ensure either cn, mail, or uid contains the username
                const matchedAttribute = [cnAttribute, mailAttribute, uidAttribute].find(attr => attr && attr.values.includes(username));
                expect(matchedAttribute).toBeDefined();

                console.log('Expected username:', username);
                if (matchedAttribute) {
                    console.log('Returned value:', matchedAttribute.values[0]);
                }
                console.log('Entry attributes:', entry.attributes);
            });

            res.on('error', (error) => {
                expect(error).toBeUndefined();
                done();
            });

            res.on('end', () => {
                expect(numEntries).toBe(1); // Should match exactly one user
                done();
            });
        });
    });

    test('LDAP server processes search requests correctly with a specific user DN (base search)', (done) => {
        const baseDN = 'uid=137326771,ou=users,o=plex.tv'; // Replace with the actual test user DN
        const filter = '(objectclass=Plex.tv User)';

        ldapClient.search(baseDN, {
            scope: 'base', // base search for the specific DN
            filter
        }, (err, res) => {
            expect(err).toBeNull();

            let numEntries = 0;
            res.on('searchEntry', (entry) => {
                numEntries++;
                expect(entry).toBeDefined();
                expect(Array.isArray(entry.attributes)).toBe(true);
            });

            res.on('error', (error) => {
                expect(error).toBeUndefined();
            });

            res.on('end', () => {
                expect(numEntries).toBe(1); // Expect exactly one entry to be returned
                done();
            });
        });
    });

    test('LDAP server processes search requests correctly with a specific group filter', (done) => {
        const baseDN = 'ou=users, o=plex.tv';
        const groupName = 'PlexMex'; // Make sure this group exists under "ou=users, o=plex.tv"
        const filter = `(&(objectclass=groupOfNames)(cn=${groupName}))`;

        ldapClient.search(baseDN, {
            scope: 'sub',
            filter
        }, (err, res) => {
            expect(err).toBeNull();

            let numEntries = 0;
            res.on('searchEntry', (entry) => {
                numEntries++;
                expect(entry).toBeDefined();
                expect(Array.isArray(entry.attributes)).toBe(true);
                
                const cnAttribute = entry.attributes.find(attr => attr.type.toLowerCase() === 'cn');
                expect(cnAttribute).toBeDefined();
                expect(cnAttribute.values).toContain(groupName);

                console.log('Expected group name:', groupName);
                console.log('Returned group name:', cnAttribute.values[0]);
                console.log('Entry attributes:', entry.attributes);

                const membersAttribute = entry.attributes.find(attr => attr.type.toLowerCase() === 'member');
                if (membersAttribute) {
                    console.log('Group members:', membersAttribute.values);
                } else {
                    console.log('No members found for the group');
                }
            });

            res.on('error', (error) => {
                expect(error).toBeUndefined();
                done();
            });

            res.on('end', () => {
                expect(numEntries).toBe(1); // Expect exactly one group to be found
                done();
            });
        });
    });
});
