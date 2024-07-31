const fs = require('fs');
const path = require('path');

const configFolder = path.join(__dirname, 'config');
const optionsFile = path.join(configFolder, 'options.json');

const defaults = {
    debug: false,
    port: 2389,
    host: '0.0.0.0',
    rootDN: 'ou=users, o=plex.tv',
    plexToken: '',
    plexMachineID: '',
    plexServerName: ''
};

function initializeConfig() {
    if (!fs.existsSync(configFolder)) {
        fs.mkdirSync(configFolder);
    }

    if (!fs.existsSync(optionsFile)) {
        saveConfig(defaults);
        console.log("Please fill out config/options.json");
    }
}

function loadConfig() {
    if (fs.existsSync(optionsFile)) {
        return JSON.parse(fs.readFileSync(optionsFile, 'utf8'));
    }
    return defaults;
}

function saveConfig(config) {
    fs.writeFileSync(optionsFile, JSON.stringify(config, null, '\t'), 'utf8');
}

module.exports = {
    initializeConfig,
    loadConfig,
    saveConfig
};
