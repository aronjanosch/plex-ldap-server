// database.js

const sqlite3 = require('sqlite3').verbose();
const { log } = require('./utils');

class Database {
    constructor() {
        this.db = new sqlite3.Database('./directory.db', (err) => {
            if (err) {
                log(`Error connecting to the database: ${err.message}`, 'error');
            } else {
                log('Connected to the SQLite database', 'info');
                this.createTables();
            }
        });
    }

    createTables() {
        const createEntriesTableQuery = `
            CREATE TABLE IF NOT EXISTS entries (
                dn TEXT PRIMARY KEY,
                objectClass TEXT,
                attributes TEXT
            )
        `;

        this.db.run(createEntriesTableQuery, (err) => {
            if (err) {
                log(`Error creating entries table: ${err.message}`, 'error');
            } else {
                log('Entries table created or already exists', 'info');
            }
        });
    }

    saveEntry(entry) {
        const insertQuery = 'INSERT OR REPLACE INTO entries (dn, objectClass, attributes) VALUES (?, ?, ?)';

        const { dn, attributes } = entry;
        const objectClass = attributes.objectClass.join(',');
        const attributesJSON = JSON.stringify(attributes);

        this.db.run(insertQuery, [dn, objectClass, attributesJSON], (err) => {
            if (err) {
                log(`Error saving entry ${dn}: ${err.message}`, 'error');
            }
        });
    }

    saveEntries(entries) {
        this.db.serialize(() => {
            this.db.run('BEGIN TRANSACTION');

            entries.forEach((entry) => {
                this.saveEntry(entry);
            });

            this.db.run('COMMIT', (err) => {
                if (err) {
                    log(`Error committing transaction: ${err.message}`, 'error');
                } else {
                    log('Entries saved to the database', 'info');
                }
            });
        });
    }

    getEntries(callback) {
        const selectQuery = 'SELECT * FROM entries';

        this.db.all(selectQuery, (err, rows) => {
            if (err) {
                log(`Error retrieving entries from the database: ${err.message}`, 'error');
                callback([]);
            } else {
                const entries = rows.map((row) => ({
                    dn: row.dn,
                    attributes: JSON.parse(row.attributes),
                }));
                callback(entries);
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