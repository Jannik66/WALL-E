import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { AudioPlayer } from '../audio/audioPlayer';
import { Logger } from '../logger';
import * as ytdl from 'ytdl-core';
import { PlaylistSongs } from '../entities/playlistSongs';

export default class playlistAddCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 8,
        name: 'playlistadd',
        category: 'Playlist',
        description: 'Add any song to a playlist',
        argsRequired: true,
        admin: false,
        aliases: ['pa'],
        usage: 'playlistadd {Playlistname} {Youtube link}',
        examples: ['playlistadd Litmusic https://youtu.be/GMb02tAqDRM']
    }

    private _botClient: BotClient;

    private _client: Client;

    private _logger: Logger;

    public initCommand(botClient: BotClient) {
        this._botClient = botClient;
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const playlistName = args[0];

        const videoRegex = args[1].match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
        let videoID: string;

        if (!videoRegex) {
            this._logger.logError(msg, ':no_entry_sign: Please provide a valid youtube link.');
            msg.delete();
            return;
        }
        videoID = videoRegex[5];
        if (!videoID) {
            this._logger.logError(msg, ':no_entry_sign: Please provide a valid youtube link.');
            msg.delete();
            return;
        }
        const playlist = await this._botClient.getDBConnection().getPlaylistsRepository().findOne({ where: { name: playlistName } });
        if (!playlist) {
            this._logger.logError(msg, `:no_entry_sign: Playlist "${playlistName}" not found. Get a list of playlists with \`${prefix}playlists\``);
            msg.delete();
            return;
        }

        await msg.react('🔎');
        ytdl.getBasicInfo(videoID, async (err, info) => {
            if (err) {
                this._logger.logError(msg, ':no_entry_sign: Youtube video not found.');
                msg.delete();
                return;
            }
            if (parseInt(info.length_seconds) > 39600) {
                this._logger.logError(msg, ':no_entry_sign: Sorry, but this fucking video is longer than 11 hours. Get some help.');
                msg.delete();
                return;
            }
            if (playlist.songs && playlist.songs.find(song => song.id === videoID)) {
                this._logger.logError(msg, `:no_entry_sign: The song ${info.title} already exists in ${playlist.name}`);
                msg.delete();
                return;
            }
            const song = new PlaylistSongs();
            song.id = videoID;
            song.name = info.title;
            song.playlistIndex = playlist.songs ? playlist.songs.length + 1 : 1;
            if (playlist.songs) {
                playlist.songs.push(song);
            } else {
                playlist.songs = [song];
            }

            // ERROR: SONG IS NOT BEEING ADDED
            await this._botClient.getDBConnection().getConnection().manager.save(playlist);
            this._logger.logSuccess(msg, `Successfully added **${info.title}** to "${playlist.name}"`);
            msg.delete();
        });
    }

}