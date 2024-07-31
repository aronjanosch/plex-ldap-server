const { PlexAPIHandler } = require('./plexApiHandler');
const request = require('request');

jest.mock('request');

describe('PlexAPIHandler', () => {
  test('loads Plex users correctly', async () => {
    // Mock the request module to simulate API response
    request.mockImplementation((options, callback) => {
      callback(null, { statusCode: 200 }, '<MediaContainer><User id="123" username="testuser" /></MediaContainer>');
    });

    const handler = new PlexAPIHandler();
    const users = await handler.loadPlexUsers();

    expect(users).toHaveLength(1);
    expect(users[0].attributes.cn).toEqual('testuser');
  });

  test('handles errors', async () => {
    request.mockImplementation((options, callback) => {
      callback(new Error('Failed to fetch'), { statusCode: 500 }, null);
    });

    const handler = new PlexAPIHandler();

    await expect(handler.loadPlexUsers()).rejects.toThrow('Failed to load Plex users');
  });
});
