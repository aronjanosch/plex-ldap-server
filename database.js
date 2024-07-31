// database.js

const sqlite3 = require('sqlite3').verbose();
const { log } = require('./utils');

class Database {
    constructor() {
        this.db = new sqlite3.Database('./users.db', (err) => {
            if (err) {
                log(`Error connecting to the database: ${err.message}`, 'error');
            } else {
                log('Connected to the SQLite database', 'info');
                this.createTable();
            }
        });
    }

    createTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                dn TEXT PRIMARY KEY,
                attributes TEXT
            )
        `;

        this.db.run(createTableQuery, (err) => {
            if (err) {
                log(`Error creating users table: ${err.message}`, 'error');
            } else {
                log('Users table created or already exists', 'info');
            }
        });
    }

    saveUsers(users) {
        const insertQuery = 'INSERT OR REPLACE INTO users (dn, attributes) VALUES (?, ?)';

        this.db.serialize(() => {
            this.db.run('BEGIN TRANSACTION');

            users.forEach((user) => {
                const { dn, attributes } = user;
                const attributesJSON = JSON.stringify(attributes);
                this.db.run(insertQuery, [dn, attributesJSON], (err) => {
                    if (err) {
                        log(`Error saving user ${dn}: ${err.message}`, 'error');
                    }
                });
            });

            this.db.run('COMMIT', (err) => {
                if (err) {
                    log(`Error committing transaction: ${err.message}`, 'error');
                } else {
                    log('Users saved to the database', 'info');
                }
            });
        });
    }

    getUsers(callback) {
        const selectQuery = 'SELECT * FROM users';

        this.db.all(selectQuery, (err, rows) => {
            if (err) {
                log(`Error retrieving users from the database: ${err.message}`, 'error');
                callback([]);
            } else {
                const users = rows.map((row) => ({
                    dn: row.dn,
                    attributes: JSON.parse(row.attributes),
                }));
                callback(users);
            }
        });
    }

    close() {
        this.db.close((err) => {
            if (err) {
                log(`Error closing the database connection: ${err.message}`, 'error');
            } else {
                log('Closed the database connection', 'info');
            }
        });
    }
}

module.exports = Database;