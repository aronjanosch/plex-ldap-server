// plexApiHandler.js

const request = require('request');
const { parseString } = require('xml2js');
const { log } = require('../utils/utils');
const { loadConfig } = require('../configManager');

class PlexAPIHandler {
    constructor() {
        const config = loadConfig();
        this.plexToken = config.plexToken;
    }

    async loadPlexUsers() {
        return new Promise((resolve, reject) => {
            const options = {
                url: 'https://plex.tv/api/users?X-Plex-Token=' + this.plexToken,
                method: 'GET'
            };

            request(options, (err, res, body) => {
                if (err || res.statusCode !== 200) {
                    log(`Error fetching Plex users: ${err || body}`);
                    reject(new Error('Failed to load Plex users'));
                    return;
                }

                parseString(body, (err, result) => {
                    if (err) {
                        log(`Error parsing Plex users: ${err}`);
                        reject(new Error('Failed to parse Plex users'));
                        return;
                    }
                    const users = result.MediaContainer.User.map(u => this.plexUserToLDAP(u));
                    resolve(users);
                });
            });
        });
    }

    plexUserToLDAP(pUser) {
        const servers = pUser.Server ? pUser.Server.map((server) => server.$.name) : [];
        return {
            dn: `uid=${pUser.$.id}, ou=users, o=plex.tv`,
            attributes: {
                objectclass: ['Plex.tv User'],
                cn: pUser.$.username,
                uid: pUser.$.id,
                email: pUser.$.email,
                title: pUser.$.title,
                thumb: pUser.$.thumb,
                o: 'plex.tv',
                server: servers
            }
        };
    }

    async authenticateWithPlex(username, password) {
        return new Promise((resolve, reject) => {
            const authString = `${username}:${password}`;
            const buffer = Buffer.from(authString, 'binary');
            const authHeaderVal = `Basic ${buffer.toString('base64')}`;

            const options = {
                url: 'https://plex.tv/users/sign_in.json',
                method: 'POST',
                headers: {
                    'X-Plex-Client-Identifier': 'PlexLDAPAuth',
                    'X-Plex-Product': 'PlexLDAPAuth',
                    'X-Plex-Version': '1.0',
                    'Content-Type': 'application/json',
                    'Authorization': authHeaderVal
                }
            };

            request(options, (err, res, body) => {
                if (!err && (res.statusCode === 200 || res.statusCode === 201)) {
                    const plexUser = JSON.parse(body).user;
                    log(`Authentication successful for user: ${username}`, 'info');
                    resolve({ success: true, plexUser });
                } else {
                    log(`Authentication failed for user: ${username}. Error: ${err || body}`, 'error');
                    resolve({ success: false });
                }
            });
        });
    }
}


module.exports = {
    PlexAPIHandler
};
