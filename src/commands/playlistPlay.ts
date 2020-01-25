import { Message, Client, MessageEmbed } from 'discord.js';
import shuffle from 'shuffle-array';

import config from '../config';
import { BotCommand, BotClient } from '../customInterfaces';
import { AudioPlayer } from '../audio/audioPlayer';
import { Logger } from '../messages/logger';
import { Playlist } from '../entities/playlist';

export default class playlistPlayCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 10,
        name: 'playlistplay',
        category: 'Playlist',
        description: 'Adds the songs of a playlist to the queue.',
        argsRequired: true,
        admin: false,
        aliases: ['pp'],
        usage: 'playlistplay {playlistname | id} {all | number of songs}',
        examples: ['playlistplay MEMES 10', 'playlistplay MEMES all']
    }

    private _client: Client;

    private _audioPlayer: AudioPlayer;

    private _logger: Logger;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._audioPlayer = this._botClient.getAudioPlayer();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        let playlistIdentifier = args[0];
        let playlist: Playlist;
        if (!args[1]) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, please provide a quantity of songs. Use \`all\` to play the entire playlist.`);
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
        if (playlist.songs.length === 0) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, playlist has 0 songs. Bruh.`);
            return;
        }

        let embed = new MessageEmbed();
        embed.setColor(0x007BFF);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        if (!msg.member.voice.channel) {
            this._logger.logError(msg, ':no_entry_sign: Please join a voice channel.');
            return;
        } else if (msg.guild.member(this._client.user).voice.channel && msg.guild.member(this._client.user).voice.channel !== msg.member.voice.channel) {
            this._logger.logError(msg, `:no_entry_sign: You're not in the same voice channel as the bot.\n Use \`${prefix}leave\` to disconnect the bot.`);
            return;
        }

        let songs = shuffle(playlist.songs);
        if (args[1].toLowerCase() === 'all') {
            embed.setTitle(`Enqueued ${playlist.songs.length} Songs from playlist ${playlist.name}.`);
            for (const song of songs) {
                this._audioPlayer.addVideo(msg.member.voice.channel, { name: song.name, requester: msg.author.id, id: song.songId, length: song.length });
            };
        } else {
            if (!args[1].match(/^[0-9]*$/)) {
                this._sendMessage(msg, `:x: ${msg.author.toString()}, please provide a valid number.`);
                return;
            } else if (parseInt(args[1]) > songs.length) {
                this._sendMessage(msg, `:x: ${msg.author.toString()}, the playlist ${playlist.name} only contains ${songs.length} songs.`);
                return;
            }
            const count = parseInt(args[1]);
            embed.setTitle(`Enqueued ${count} Songs from playlist ${playlist.name}.`);
            for (let i = 0; i < count; i++) {
                this._audioPlayer.addVideo(msg.member.voice.channel, { name: songs[i].name, requester: msg.author.id, id: songs[i].songId, length: songs[i].length });
            }
        }
        this._logger.logEmbed(embed);
        msg.delete();
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