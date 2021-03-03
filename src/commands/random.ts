import { Message, Client, MessageEmbed } from 'discord.js';
import shuffle from 'shuffle-array';

import { BotCommand, BotClient } from '../customInterfaces';
import { AudioPlayer } from '../audio/audioPlayer';
import { Logger } from '../messages/logger';
import { Song } from '../entities/song';

export default class randomCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 19,
        name: 'random',
        category: 'Music',
        description: 'Plays a given amount of random songs, picked from the songs database.',
        argsRequired: true,
        admin: false,
        aliases: ['r'],
        usage: 'random {number of songs}',
        examples: ['random 10']
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
        let songs: Song[];
        if (!args[0]) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, please provide a quantity of songs.`);
            return;
        }
        if (!args[0].match(/^[0-9]*$/)) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, please enter a valid number.`);
            return;
        } else {
            songs = await this._botClient.getDatabase().getConnection().getRepository(Song).find();
        }
        if (songs.length === 0) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, There are no songs in the database...`);
            return;
        }
        const totalSongs = songs.length;
        const numberOfSongs = parseInt(args[0]);
        if (numberOfSongs > totalSongs) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, there are only ${totalSongs} songs to play.`);
            return;
        }

        let embed = new MessageEmbed();
        embed.setColor(0x007BFF);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        if (!msg.member.voice.channel) {
            this._logger.logError(msg.author.id, ':no_entry_sign: Please join a voice channel.');
            return;
        } else if (msg.guild.member(this._client.user).voice.channel && msg.guild.member(this._client.user).voice.channel !== msg.member.voice.channel) {
            this._logger.logError(msg.author.id, `:no_entry_sign: You're not in the same voice channel as the bot.\n Use \`${prefix}leave\` to disconnect the bot.`);
            return;
        }

        songs = shuffle(songs);
        songs = songs.slice(0, numberOfSongs);
        embed.setTitle(`Enqueued ${numberOfSongs} random Songs.`);
        for (const song of songs) {
            this._audioPlayer.addVideo(msg.member.voice.channel, { name: song.name, requester: msg.author.id, id: song.id, length: song.length });
        };
        this._logger.logEmbed(embed);
        msg.delete();
    }

    private _sendMessage(msg: Message, text: string) {
        if (msg.channel.id === this._botClient.getConfig().wallEChannelID) {
            msg.channel.send(text);
        } else {
            msg.delete();
            this._logger.logText(text);
        }
    }
}