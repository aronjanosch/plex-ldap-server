// userAuthentication.js

const { PlexAPIHandler } = require('./plexApiHandler');
const { log } = require('./utils');
const Database = require('./database');

const db = new Database();

async function loadUsersIfNeeded() {
    return new Promise((resolve, reject) => {
        db.getUsers((users) => {
            if (users.length === 0) {
                log('Users cache is empty. Fetching users from Plex API', 'info');
                const plexApiHandler = new PlexAPIHandler();
                plexApiHandler.loadPlexUsers()
                    .then((fetchedUsers) => {
                        db.saveUsers(fetchedUsers);
                        log(`Fetched ${fetchedUsers.length} users from Plex API`, 'info');
                        resolve(fetchedUsers);
                    })
                    .catch((error) => {
                        log(`Error fetching users: ${error.message}`, 'error');
                        reject(error);
                    });
            } else {
                log(`Loaded ${users.length} users from the database`, 'info');
                resolve(users);
            }
        });
    });
}

async function authenticateUser(username, password) {
    const users = await loadUsersIfNeeded();
    log(`Authenticating user: ${username}`, 'info');
    const user = users.find((u) => u.attributes.cn === username);

    if (user) {
        log(`User found in cache: ${username}`, 'info');
        const plexApiHandler = new PlexAPIHandler();
        const authenticationResult = await plexApiHandler.authenticateWithPlex(username, password);
        if (authenticationResult.success) {
            log(`Authentication successful for user: ${username}`, 'info');
            return authenticationResult.plexUser;
        } else {
            log(`Authentication failed for user: ${username}. Invalid credentials.`, 'info');
            return null;
        }
    } else {
        log(`User not found in cache: ${username}`, 'info');
        return null;
    }
}

async function findUserByDn(dn, filter) {
    const users = await loadUsersIfNeeded();
    log(`Finding user by DN: ${dn}`, 'info');
    const matchedUsers = users.filter((u) => {
        const dnMatch = u.dn === dn;
        const filterMatch = Object.keys(filter).every((key) => filter[key] === u.attributes[key]);
        return dnMatch && filterMatch;
    });

    if (matchedUsers.length > 0) {
        log(`Found ${matchedUsers.length} user(s) matching DN: ${dn}`, 'info');
    } else {
        log(`No users found matching DN: ${dn}`, 'info');
    }

    return matchedUsers;
}

module.exports = {
    authenticateUser,
    findUserByDn,
};
