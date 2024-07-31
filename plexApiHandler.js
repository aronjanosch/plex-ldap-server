const request = require('request');
const { parseString } = require('xml2js');
const { log } = require('./utils');
const { loadConfig } = require('./configManager');

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
                    const users = result.MediaContainer.User.map(u => this.plexUserToLDAP(u.$));
                    resolve(users);
                });
            });
        });
    }

    plexUserToLDAP(pUser) {
        return {
            dn: `uid=${pUser.id}, ou=users, o=plex.tv`,
            attributes: {
                objectclass: ['Plex.tv User'],
                cn: pUser.username,
                uid: pUser.id,
                email: pUser.email,
                title: pUser.title,
                thumb: pUser.thumb,
                o: 'plex.tv'
            }
        };
    }
}

module.exports = PlexAPIHandler;
