// userAuthentication.js

const ldap = require('ldapjs');
const { PlexAPIHandler } = require('./plexApiHandler');
const { log } = require('../utils/utils');
const Database = require('../utils/database');
const { loadConfig } = require('../configManager');

const db = new Database();

async function authenticateUser(identifier, password, identifierType) {
    const users = await loadUsersIfNeeded();
    log(`Authenticating user with ${identifierType.toUpperCase()}: ${identifier}`, 'info');
    const user = users.find((u) => u.attributes[identifierType] === identifier);

    if (user) {
        log(`User found in cache: ${identifier}`, 'info');
        const plexApiHandler = new PlexAPIHandler();
        const authenticationResult = await plexApiHandler.authenticateWithPlex(user.attributes.cn, password);
        if (authenticationResult.success) {
            log(`Authentication successful for user: ${identifier}`, 'info');
            return authenticationResult.plexUser;
        } else {
            log(`Authentication failed for user: ${identifier}. Invalid credentials.`, 'info');
            return null;
        }
    } else {
        log(`User not found in cache: ${identifier}`, 'info');
        return null;
    }
}

async function loadUsersIfNeeded() {
    return new Promise((resolve, reject) => {
        db.getEntries((entries) => {
            if (entries.length === 0) {
                log('Directory cache is empty. Fetching users from Plex API', 'info');
                const plexApiHandler = new PlexAPIHandler();
                plexApiHandler.loadPlexUsers()
                    .then((fetchedUsers) => {
                        const ldapEntries = fetchedUsers.map((user) => ({
                            dn: `uid=${user.attributes.uid}, ${loadConfig().rootDN}`,
                            attributes: {
                                objectClass: ['Plex.tv User'],
                                ...user.attributes
                            }
                        }));

                        // Create LDAP groups based on server names
                        const serverGroups = {};
                        fetchedUsers.forEach((user) => {
                            const servers = user.attributes.server;
                            servers.forEach((server) => {
                                if (!serverGroups[server]) {
                                    serverGroups[server] = {
                                        dn: `cn=${server}, ${loadConfig().rootDN}`,
                                        attributes: {
                                            objectClass: ['groupOfNames'],
                                            cn: server,
                                            member: []
                                        }
                                    };
                                }
                                serverGroups[server].attributes.member.push(`uid=${user.attributes.uid}, ${loadConfig().rootDN}`);
                            });
                        });

                        const groupEntries = Object.values(serverGroups);
                        const allEntries = [...ldapEntries, ...groupEntries];

                        db.saveEntries(allEntries);
                        log(`Fetched ${fetchedUsers.length} users and created ${groupEntries.length} groups`, 'info');

                        resolve(allEntries);
                    })
                    .catch((error) => {
                        log(`Error fetching users: ${error.message}`, 'error');
                        reject(error);
                    });
            } else {
                log(`Loaded ${entries.length} entries from the database`, 'info');
                resolve(entries);
            }
        });
    });
}

async function findEntryByDn(dn, filter, scope) {
    const entries = await loadUsersIfNeeded();
    log(`Finding entries under base DN: ${dn}`, 'info');

    const normalizedDn = dn.replace(/\s*,\s*/g, ',');

    const matchedEntries = entries.filter((entry) => {
        const normalizedEntryDn = entry.dn.replace(/\s*,\s*/g, ',');

        let dnMatch;
        switch (scope) {
            case 'base':
                dnMatch = normalizedEntryDn === normalizedDn;
                break;
            case 'one':
                dnMatch = normalizedEntryDn === normalizedDn || ldap.parseDN(normalizedEntryDn).parent().toString() === normalizedDn;
                break;
            case 'sub':
                dnMatch = normalizedEntryDn === normalizedDn || normalizedEntryDn.endsWith(`,${normalizedDn}`);
                break;
            default:
                dnMatch = normalizedEntryDn.endsWith(`,${normalizedDn}`);
        }

        const filterMatch = filter.matches(entry.attributes);

        return dnMatch && filterMatch;
    });

    if (matchedEntries.length === 0 && scope === 'base') {
        throw new ldap.NoSuchObjectError(dn);
    }

    return matchedEntries.map((entry) => ({
        dn: entry.dn,
        attributes: entry.attributes
    }));
}

module.exports = {
    authenticateUser,
    findEntryByDn
};
