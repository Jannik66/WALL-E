import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { AudioPlayer } from '../audioPlayer';
import { Logger } from '../logger';
import { MusicQueue } from '../musicQueue';

export default class skipCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 2,
        name: 'skip',
        category: 'Music',
        description: 'Skips one song.',
        argsRequired: false,
        hasAfterInit: true,
        admin: false,
        aliases: ['s'],
        usage: 'skip',
        examples: ['skip']
    }

    private _botClient: BotClient;

    private _client: Client;

    private _audioPlayer: AudioPlayer;

    private _logger: Logger;

    private _musicQueue: MusicQueue;

    public initCommand(botClient: BotClient) {
        this._botClient = botClient;
        this._client = this._botClient.getClient();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        // check if bot is in a voice channel
        if (!msg.guild.member(this._client.user).voice.channel || this._musicQueue.getQueue().length === 0) {
            this._logger.logError(msg, `:no_entry_sign: I'm not playing anything.`);
            // check if bot and user are in the same voice channel
        } else if (msg.guild.member(this._client.user).voice.channel && msg.guild.member(this._client.user).voice.channel !== msg.member.voice.channel) {
            this._logger.logError(msg, `:no_entry_sign: You're not in the same voice channel as the bot.\n Use \`${prefix}leave\` to disconnect the bot.`);
        } else {
            this._audioPlayer.skip(msg);
        }
        msg.delete();
    }

    public afterInit() {
        this._audioPlayer = this._botClient.getAudioPlayer();
        this._logger = this._botClient.getLogger();
        this._musicQueue = this._botClient.getMusicQueue();
    }

}