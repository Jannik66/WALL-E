# ![Imgur](https://i.imgur.com/qO3X7Yi.png)

Is a personalized Discord Music & Stat Bot for the BDC Discord Server.

# Features

## Music

- Play (almost) every youtube video in your Discord channel.

## Database

- WALL-E logs every song in a database
- He also keeps track of you
- The search command allows you to search through this database

## Playlist

- With WALL-E you can create endless playlist to save all of your favorite songs
- Add an entire playlist to the queue and enjoy your evening musically
- You can also let WALL-E "copy" a Youtube playlist and save it to the database

# Setting WALL-E up
## Config file
WALL-E needs a `config.json` file with the following content:
```json
{
    "logChannelID": "LOG_CHANNEL_ID",
    "dashboardChannelID": "DASHBOARD_CHANNEL_ID",
    "wallEChannelID": "WALLE_CHANNEL_ID",
    "nowPlayingMessageID": "NOWPLAYING_MESSAGE_ID",
    "songLeaderboardMessageID": "SONGLEADERBOARD_MESSAGE_ID",
    "djLeaderboardMessageID": "DJLEADERBOARD_MESSAGE_ID",
    "hallOfBDCChannelID": "HALLOFBDC_CHANNEL_ID",
    "voiceStatMessageID": "VOICESTAT_MESSAGE_ID",
    "BDCGuildID": "GUILD_ID",
    "botOwnerID": "YOUR_DISCORD_ID",
    "botToken": "YOUR_BOT_TOKEN",
    "prefix": "PREFIX",
    "botID": "BOT_ID",
    "maxPlaylistSongs": 1500,
    "DBLogging": false,
    "DBPath": "/database/WALLE.db",
    "excludedVoiceChannelIds": ["AFKCHANNEL_ID"]
}
```
## Starting the container
WALL-E gets automatically builded and deployed on [Docker Hub](https://hub.docker.com/r/giyomoon/wall-e) and can be pulled from there.

The container can be run with the following command:
```bash
docker run -d -v PATH_TO_YOUR_CONFIG_FOLDER:/wall-e/config -v PATH_TO_YOUR_DATABASE_FOLDER:/database --name WALL-E giyomoon/wall-e
```

For example:
```bash
docker run -d -v /srv/config:/wall-e/config -v /srv/database:/database --name WALL-E giyomoon/wall-e
```
### Volume folders
`/srv/config` is a folder which includes the `config.json` file.

`/srv/database` is the folder which includes the sqlite database file.
