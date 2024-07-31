// index.js

const LDAPServer = require('./ldapServer');
const { initializeConfig } = require('./configManager');
const { log } = require('./utils');

function main() {
    // Initialize configuration
    initializeConfig();

    // Create and start the LDAP server
    const ldapServer = new LDAPServer();
    ldapServer.start();

    log('Application started successfully.');
}

main();
