import { Message, Client } from 'discord.js';
import * as ytdl from 'ytdl-core';

import { BotCommand, BotClient, QueueSong } from '../customInterfaces';
import { AudioPlayer } from '../audio/audioPlayer';
import { Logger } from '../messages/logger';

export default class playCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 1,
        name: 'play',
        category: 'Music',
        description: 'Play any youtube song.',
        argsRequired: true,
        admin: false,
        aliases: ['p'],
        usage: 'play {youtube link}',
        examples: ['play https://youtu.be/GMb02tAqDRM']
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

        // create regex of youtube link
        let videoRegex = args[0].match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
        let videoID: string;
        // check if user is in a voice channel
        if (!msg.member.voice.channel) {
            this._logger.logError(msg.author.id, ':no_entry_sign: Please join a voice channel.');

            // check if user and bot are in the same voice channel
        } else if (msg.guild.member(this._client.user).voice.channel && msg.guild.member(this._client.user).voice.channel !== msg.member.voice.channel) {
            this._logger.logError(msg.author.id, `:no_entry_sign: You're not in the same voice channel as the bot.\n Use \`${prefix}leave\` to disconnect the bot.`);

            // if youtube regex is isvalid
        } else if (!videoRegex) {
            this._logger.logError(msg.author.id, ':no_entry_sign: Please provide a valid youtube link.');
        } else {
            videoID = videoRegex[5];
            // if regex conatins a videoID
            if (videoID) {
                await msg.react('🔎');
                ytdl.getBasicInfo(videoID).then(info => {
                    if (parseInt(info.videoDetails.lengthSeconds) > 39600) {
                        this._logger.logError(msg.author.id, ':no_entry_sign: Sorry, but this fucking video is longer than 11 hours. Get some help.');
                        msg.delete();
                        return;
                    }
                    if (!info.videoDetails.title) {
                        this._logger.logError(msg.author.id, `:no_entry_sign: Youtube video with ID \`${videoID}\` is not accessible. Maybe private?`);
                        return;
                    }
                    if (parseInt(info.videoDetails.lengthSeconds) === 0) {
                        this._logger.logError(msg.author.id, `:no_entry_sign: I can't play streams.`);
                        return;
                    }
                    const song: QueueSong = { name: info.videoDetails.title, requester: msg.author.id, id: info.videoDetails.videoId, length: parseInt(info.videoDetails.lengthSeconds) };
                    this._audioPlayer.addVideo(msg.member.voice.channel, song);
                    this._logger.logSong(msg, song);
                    msg.delete();
                }).catch(err => {
                    console.log(err);
                    this._logger.logError(msg.author.id, ':no_entry_sign: Youtube video not found.');
                    msg.delete();
                    return;
                });
            } else {
                this._logger.logError(msg.author.id, ':no_entry_sign: Please provide a valid youtube link.');
            }
        }
        // if no video is beeing searched, delete the message
        if (!videoID) {
            msg.delete();
        }
    }
}