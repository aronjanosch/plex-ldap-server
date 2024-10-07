const { log } = require('console');
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');

const configFolder = path.join(__dirname, 'config');
const optionsFile = path.join(configFolder, 'options.json');
const envFile = path.join(configFolder, '.env');

const defaults = {
    port: 389,
    host: '0.0.0.0',
    rootDN: 'ou=users, o=plex.tv',
    plexToken: '',
    plexMachineID: '',
    plexServerName: '',
    logLevel: 'info'
};

// Function to initialize config on startup
function initializeConfig() {
    // Ensure config folder exists
    if (!fs.existsSync(configFolder)) {
        fs.mkdirSync(configFolder);
    }

    // Create options.json with defaults if not exists
    if (!fs.existsSync(optionsFile)) {
        saveConfig(defaults);
        console.log("options.json created with default settings. Please update it if needed.");
    }

    // If .env exists, inform the user that it's loaded for development or local use
    if (fs.existsSync(envFile)) {
        console.log(".env file detected. Loading environment variables for local testing.");
    }
}

// Function to load and return config
function loadConfig() {
    // Load environment variables from .env if present
    if (fs.existsSync(envFile)) {
        dotenv.config({ path: envFile });
    }

    // Start with defaults
    let config = { ...defaults };

    // If options.json exists, merge its content
    if (fs.existsSync(optionsFile)) {
        const fileConfig = JSON.parse(fs.readFileSync(optionsFile, 'utf8'));
        config = { ...config, ...fileConfig };
    }

    // Overwrite config with environment variables if they exist (from .env or Docker)
    config.plexToken = process.env.PLEX_TOKEN || config.plexToken;
    config.plexMachineID = process.env.PLEX_MACHINE_ID || config.plexMachineID;
    config.plexServerName = process.env.PLEX_SERVER_NAME || config.plexServerName;
    config.logLevel = process.env.LOG_LEVEL || config.logLevel;

    return config;
}

// Save config to options.json
function saveConfig(config) {
    fs.writeFileSync(optionsFile, JSON.stringify(config, null, '\t'), 'utf8');
}

// Initialize configuration on server start
initializeConfig();

module.exports = {
    initializeConfig,
    loadConfig,
    saveConfig
};
