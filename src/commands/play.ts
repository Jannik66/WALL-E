import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { AudioPlayer } from '../audioPlayer';
import * as ytdl from 'ytdl-core';
import { Logger } from '../logger';

export default class playCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 1,
        name: 'play',
        category: 'Music',
        description: 'Play any youtube song.',
        argsRequired: true,
        hasAfterInit: true,
        admin: false,
        aliases: ['p'],
        usage: 'play {youbute link}',
        examples: ['play https://youtu.be/GMb02tAqDRM']
    }

    private _botClient: BotClient;

    private _client: Client;

    private _audioPlayer: AudioPlayer;

    private _logger: Logger;

    public initCommand(botClient: BotClient) {
        this._botClient = botClient;
        this._client = this._botClient.getClient();
    }

    public async execute(msg: Message, args: string[], prefix: string) {

        // create regex of youtube link
        let videoRegex = args[0].match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
        let videoID: string;
        // check if user is in a voice channel
        if (!msg.member.voice.channel) {
            this._logger.logError(msg, ':no_entry_sign: Please join a voice channel.');

            // check if user and bot are in the same voice channel
        } else if (msg.guild.member(this._client.user).voice.channel && msg.guild.member(this._client.user).voice.channel !== msg.member.voice.channel) {
            this._logger.logError(msg, `:no_entry_sign: You're not in the same voice channel as the bot.\n Use \`${prefix}leave\` to disconnect the bot.`);

            // if youtube regex is isvalid
        } else if (!videoRegex) {
            this._logger.logError(msg, ':no_entry_sign: Please provide a valid youtube link.');
        } else {
            videoID = videoRegex[5];
            // if regex conatins a videoID
            if (videoID) {
                msg.react('🔎');
                ytdl.getBasicInfo(videoID, (err, info) => {
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

                    this._audioPlayer.addVideo(msg, { name: info.title, requester: msg.author.id, id: info.video_id, length: info.length_seconds });
                    this._logger.logSong(msg, { name: info.title, id: info.video_id });
                    msg.delete();
                });
            } else {
                this._logger.logError(msg, ':no_entry_sign: Please provide a valid youtube link.');
            }
        }
        // if no video is beeing searched, delete the message
        if (!videoID) {
            msg.delete();
        }
    }

    public afterInit() {
        this._audioPlayer = this._botClient.getAudioPlayer();
        this._logger = this._botClient.getLogger();
    }

}