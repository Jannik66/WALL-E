import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { AudioPlayer } from '../audioPlayer';
import youtubedl from 'youtube-dl';
import { Logger } from '../logger';

export default class playCommand implements BotCommand {
    information: BotCommand['information'] = {
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

    BotClient: BotClient;

    client: Client;

    audioPlayer: AudioPlayer;

    logger: Logger;

    public initCommand(bot: BotClient) {
        this.BotClient = bot;
        this.client = this.BotClient.getClient();
    }

    public async execute(msg: Message, args: string[], prefix: string) {

        // create regex of youtube link
        let videoRegex = args[0].match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
        let videoID: string;
        // check if user is in a voice channel
        if (!msg.member.voice.channel) {
            this.logger.logError(msg, ':no_entry_sign: Please join a voice channel.');

            // check if user and bot are in the same voice channel
        } else if (msg.guild.member(this.client.user).voice.channel && msg.guild.member(this.client.user).voice.channel !== msg.member.voice.channel) {
            this.logger.logError(msg, `:no_entry_sign: You're not in the same voice channel as the bot.\n Use \`${prefix}leave\` to disconnect the bot.`);

            // if youtube regex is isvalid
        } else if (!videoRegex) {
            this.logger.logError(msg, ':no_entry_sign: Please provide a valid youtube link.');
        } else {
            videoID = videoRegex[5];
            // if regex conatins a videoID
            if (videoID) {
                msg.react('🔎');
                youtubedl.getInfo(videoID, [], async (err, info: any) => {
                    if (err) {
                        this.logger.logError(msg, ':no_entry_sign: Youtube video not found.');
                        return;
                    }

                    this.audioPlayer.addVideo(msg, { name: info.title, requester: msg.author.id, id: info.id });
                    this.logger.logSong(msg, { name: info.title, id: info.id });
                    msg.delete();
                });
            } else {
                this.logger.logError(msg, ':no_entry_sign: Please provide a valid youtube link.');
            }
        }
        // if no video is beeing searched, delete the message
        if (!videoID) {
            msg.delete();
        }
    }

    public afterInit() {
        this.audioPlayer = this.BotClient.getAudioPlayer();
        this.logger = this.BotClient.getLogger();
    }

}