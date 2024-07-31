// userAuthentication.js

const { loadPlexUsers } = require('./plexApiHandler');
let usersCache = [];

async function loadUsersIfNeeded() {
    if (usersCache.length === 0) {
        const plexApiHandler = new PlexAPIHandler();
        usersCache = await plexApiHandler.loadPlexUsers();
    }
}

async function authenticateUser(username, password) {
    await loadUsersIfNeeded();
    const user = usersCache.find(u => u.attributes.cn === username && u.attributes.password === password);
    return user ? user : null;
}

async function findUserByDn(dn, filter) {
    await loadUsersIfNeeded();
    return usersCache.filter(u => {
        const dnMatch = u.dn === dn;
        const filterMatch = Object.keys(filter).every(key => filter[key] === u.attributes[key]);
        return dnMatch && filterMatch;
    });
}

module.exports = {
    authenticateUser,
    findUserByDn
};
