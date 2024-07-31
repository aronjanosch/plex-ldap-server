# Plex LDAP Server
This project implements an LDAP server that integrates with Plex Media Server to provide user authentication and group management.

## Features
- User authentication against Plex.tv API
- Automatic synchronization of Plex users with the LDAP directory
- Group management based on Plex servers
- Configurable LDAP server settings
- Dockerized for easy deployment

## Prerequisites
- Node.js (version 14 or higher)
- Docker (optional, for running the server in a container)
- Plex Media Server account with API access

## Installation
1. Clone the repository:

```bash
git clone https://github.com/your-username/plex-ldap-server.git
```
2. Change to the project directory:

```bash
cd plex-ldap-server
```

3. Install the dependencies:
```bash
npm install
```

4. Create a config directory and copy the example configuration files:
```bash
mkdir config
cp src/config/options.json config/
```
5. Update the config/options.json file with your desired LDAP server settings.

6. Create a .env file in the config directory and provide the necessary environment variables:
```bash
PLEX_TOKEN=your_plex_api_token
PLEX_MACHINE_ID=your_plex_server_machine_id
PLEX_SERVER_NAME=your_plex_server_name
```

7. Start the LDAP server:

```bash
npm start
```
## Docker Usage
1. Build the Docker image:

```bash
docker build -t plex-ldap-server .
```

2. Run the Docker container:

```bash
docker run -d -p 389:389 -v /path/to/config:/app/config plex-ldap-server
```
Make sure to mount the config directory containing your configuration files.

## Configuration
The LDAP server can be configured using the config/options.json file. Here are the available options:

- debug: Enable debug logging (default: false)
- port: LDAP server port (default: 2389)
- host: LDAP server host (default: '0.0.0.0')
- rootDN: Root Distinguished Name for the LDAP directory (default: 'ou=users, o=plex.tv')
- plexToken: Plex API token (set using the PLEX_TOKEN environment variable)
- plexMachineID: Plex server machine ID (set using the PLEX_MACHINE_ID environment variable)
- plexServerName: Plex server name (set using the PLEX_SERVER_NAME environment variable)

## Testing

The project includes integration tests to verify the functionality of the LDAP server. To run the tests:

1. Make sure the LDAP server is running.
2. Set the necessary environment variables for testing in the tests/ldapServer.test.js file.
3. Run the tests:

```bash
npm test
```

## Contributing
Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License
This project is licensed under the MIT License.
