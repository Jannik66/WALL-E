import { Message } from 'discord.js';
import * as ytdl from 'ytdl-core';
var ytpl = require('ytpl');
// @ts-ignore
import progress from 'progress-string';
import schedule from 'node-schedule';

import config from '../config';
import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import { PlaylistSong } from '../entities/playlistSong';

export default class playlistLoadCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 20,
        name: 'playlistload',
        category: 'Playlist',
        description: `Save an entire playlist. (Limit: ${config.maxPlaylistSongs} songs :P)`,
        argsRequired: true,
        admin: false,
        aliases: ['pload'],
        usage: 'playlistload {playlistname} {playlistlink}',
        examples: ['playlistload Stardust_Crusaders_OST https://www.youtube.com/playlist?list=PLP0kESADYKNA4HLyruH7sldzJyvGyzSyE']
    }

    private _logger: Logger;

    private _processedSongs: number;

    constructor(private _botClient: BotClient) {
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const playlistName = args[0];
        if (!args[1]) {
            this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, please provide a valid youtube playlist link/id.`);
            return;
        }
        if (!ytpl.validateURL(args[1])) {
            this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, please provide a valid youtube playlist link/id.`);
            return;
        }
        const ytPlaylist = await ytpl(args[1], { limit: config.maxPlaylistSongs });

        if (playlistName.match(/^[0-9]*$/)) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, the playlist can't be a number`);
            return;
        }

        const existingPlaylist = await this._botClient.getDatabase().getPlaylistRepository().findOne({ where: { name: playlistName } });

        if (existingPlaylist) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, the playlist **${playlistName}** does already exist.`);
            return;
        }
        await this._botClient.getDatabase().getPlaylistRepository().insert({ name: playlistName, inRandom: true });
        const createdPlaylist = await this._botClient.getDatabase().getPlaylistRepository().findOne({ where: { name: playlistName } });
        this._sendMessage(msg, `:white_check_mark: Playlist **${playlistName}** successfully created.`);
        const songsToAdd: PlaylistSong[] = [];

        this._processedSongs = 0;
        this._initProgressBar(msg, ytPlaylist.items.length);

        for (const ytSong of ytPlaylist.items) {
            await ytdl.getBasicInfo(ytSong.id).then(info => {
                if (parseInt(info.length_seconds) > 39600) {
                    this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, sorry, but the video "${info.title}" is longer than 11 hours. Get some help.`);
                    return;
                }
                if (!info.title || !info.length_seconds) {
                    this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, youtube video with ID \`${ytSong.id}\` is not accessible. Maybe private?`);
                    return;
                }
                if (parseInt(info.length_seconds) === 0) {
                    this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, youtube video with ID \`${ytSong.id}\` is a stream.`);
                    return;
                }
                const song = new PlaylistSong();
                song.songId = ytSong.id;
                song.name = info.title;
                song.length = parseInt(info.length_seconds);
                songsToAdd.push(song);
            }).catch(err => {
                this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, youtube video \`${ytSong.title}\`, ID: \`${ytSong.id}\` not found. Might got deleted or blocked.`);
                return;
            });
        }

        await this._botClient.getDatabase().getConnection().manager.save(songsToAdd);
        createdPlaylist.songs = songsToAdd;
        await this._botClient.getDatabase().getConnection().manager.save(createdPlaylist);

        this._sendMessage(msg, `:white_check_mark: Added ${songsToAdd.length} Songs to **${playlistName}**`);
    }

    private async _initProgressBar(msg: Message, totalSongs: number) {
        const progressBarMsg = await msg.channel.send(`Now adding songs (${totalSongs} found)`);
        const messageUpdateJob = schedule.scheduleJob('*/2 * * * * *', () => {
            let progressString = `Now adding songs (${totalSongs} found)\n\``;

            let bar = progress({
                width: 20,
                total: totalSongs,
                incomplete: '─',
                complete: '▬',
                style: (complete: string, incomplete: string) => {
                    return complete + '●' + incomplete;
                }
            });
            progressString += bar(this._processedSongs);
            progressString += ` ${this._processedSongs}/${totalSongs}\``;
            progressBarMsg.edit(progressString);
            if (this._processedSongs === totalSongs) {
                messageUpdateJob.cancel();
            }
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