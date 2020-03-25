
import { Message, } from 'discord.js';
import * as ytdl from 'ytdl-core';

import config from '../config';
import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import { PlaylistSong } from '../entities/playlistSong';
import { Playlist } from '../entities/playlist';

export default class playlistAddCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 8,
        name: 'playlistadd',
        category: 'Playlist',
        description: 'Add a song to a playlist.',
        argsRequired: true,
        admin: false,
        aliases: ['pa'],
        usage: 'playlistadd {Playlistname} {Youtube link}',
        examples: ['playlistadd Litmusic https://youtu.be/GMb02tAqDRM']
    }

    private _logger: Logger;

    constructor(private _botClient: BotClient) {
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const playlistIdentifier = args[0];
        let playlist: Playlist;

        if (!args[1]) {
            this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, please provide a valid youtube link.`);
            return;
        }

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
            playlist = await this._botClient.getDatabase().getPlaylistRepository().findOne({ where: { id: playlistIdentifier }, relations: ['songs'] });
            if (!playlist) {
                this._sendMessage(msg, `:x: ${msg.author.toString()}, playlist with ID ${playlistIdentifier} not found.`);
                return;
            }
        } else {
            playlist = await this._botClient.getDatabase().getPlaylistRepository().findOne({ where: { name: playlistIdentifier }, relations: ['songs'] });
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
            if (playlist.songs && playlist.songs.find(song => song.songId === videoID)) {
                this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, the song ${info.title} already exists in ${playlist.name}`);
                return;
            }
            if (!info.title) {
                this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, youtube video with ID \`${videoID}\` is not accessible. Maybe private?`);
                return;
            }
            const song = new PlaylistSong();
            song.songId = videoID;
            song.name = info.title;
            song.length = parseInt(info.length_seconds);
            if (playlist.songs) {
                playlist.songs.push(song);
            } else {
                playlist.songs = [song];
            }
            await this._botClient.getDatabase().getConnection().manager.save(song);
            await this._botClient.getDatabase().getConnection().manager.save(playlist);

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