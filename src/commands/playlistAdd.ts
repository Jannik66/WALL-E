import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { Logger } from '../logger';
import * as ytdl from 'ytdl-core';
import { PlaylistSongs } from '../entities/playlistSongs';
import config from '../config';
import { Playlists } from '../entities/playlists';

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
        const playlistIdentifier = args[0];
        let playlist: Playlists;

        const videoRegex = args[1].match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
        let videoID: string;

        if (!videoRegex) {
            this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, please provide a valid youtube link.`);
            return;
        }
        videoID = videoRegex[5];
        if (!videoID) {
            this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, please provide a valid youtube link.`);
            return;
        }
        if (playlistIdentifier.match(/^[0-9]*$/)) {
            playlist = await this._botClient.getDBConnection().getPlaylistsRepository().findOne({ where: { id: playlistIdentifier }, relations: ['songs'] });
            if (!playlist) {
                this._sendMessage(msg, `:x: ${msg.author.toString()}, playlist with ID ${playlistIdentifier} not found.`);
                return;
            }
        } else {
            playlist = await this._botClient.getDBConnection().getPlaylistsRepository().findOne({ where: { name: playlistIdentifier }, relations: ['songs'] });
            if (!playlist) {
                this._sendMessage(msg, `:x: ${msg.author.toString()}, playlist with name ${playlistIdentifier} not found.`);
                return;
            }
        }

        await msg.react('🔎');
        ytdl.getBasicInfo(videoID, async (err, info) => {
            if (err) {
                this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, youtube video not found.`);
                return;
            }
            if (parseInt(info.length_seconds) > 39600) {
                this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, sorry, but this fucking video is longer than 11 hours. Get some help.`);
                return;
            }
            if (playlist.songs && playlist.songs.find(song => song.id === videoID)) {
                this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, the song ${info.title} already exists in ${playlist.name}`);
                return;
            }
            const song = new PlaylistSongs();
            song.id = videoID;
            song.name = info.title;
            song.length = parseInt(info.length_seconds);
            song.playlistIndex = playlist.songs ? playlist.songs.length + 1 : 1;
            if (playlist.songs) {
                playlist.songs.push(song);
            } else {
                playlist.songs = [song];
            }
            await this._botClient.getDBConnection().getConnection().manager.save(song);
            await this._botClient.getDBConnection().getConnection().manager.save(playlist);

            this._sendMessage(msg, `:white_check_mark: Successfully added **${info.title}** to **${playlist.name}**`);
        });
    }

    private _sendMessage(msg: Message, text: string) {
        if (msg.channel.id === config.wallEChannelID) {
            msg.channel.send(text);
        } else {
            msg.delete();
            this._logger.logText(text);
        }
    }

}