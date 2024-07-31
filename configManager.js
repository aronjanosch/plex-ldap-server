const { log } = require('console');
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');

const configFolder = path.join(__dirname, 'config');
const optionsFile = path.join(configFolder, 'options.json');
const envFile = path.join(__dirname, '.env');

const defaults = {
    debug: false,
    port: 2389,
    host: '0.0.0.0',
    rootDN: 'ou=users, o=plex.tv',
    plexToken: '',
    plexMachineID: '',
    plexServerName: '',
    logLevel: 'debug'
};

function initializeConfig() {
    if (!fs.existsSync(configFolder)) {
        fs.mkdirSync(configFolder);
    }

    if (!fs.existsSync(optionsFile)) {
        saveConfig(defaults);
        console.log("Please fill out config/options.json");
    }

    if (!fs.existsSync(envFile)) {
        console.log("Please create a .env file with the necessary environment variables.");
    }
}

function loadConfig() {
    dotenv.config({ path: envFile });

    let config = defaults;

    if (fs.existsSync(optionsFile)) {
        config = { ...config, ...JSON.parse(fs.readFileSync(optionsFile, 'utf8')) };
    }

    config.plexToken = process.env.PLEX_TOKEN || config.plexToken;
    config.plexMachineID = process.env.PLEX_MACHINE_ID || config.plexMachineID;
    config.plexServerName = process.env.PLEX_SERVER_NAME || config.plexServerName;

    return config;
}

function saveConfig(config) {
    fs.writeFileSync(optionsFile, JSON.stringify(config, null, '\t'), 'utf8');
}

module.exports = {
    initializeConfig,
    loadConfig,
    saveConfig
};