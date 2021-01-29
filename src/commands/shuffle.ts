import { Message, Client } from 'discord.js';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import { MusicQueue } from '../audio/musicQueue';

export default class shuffleCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 12,
        name: 'shuffle',
        category: 'Music',
        description: 'Shuffles the music queue.',
        argsRequired: false,
        admin: false,
        aliases: [],
        usage: 'shuffle',
        examples: ['shuffle']
    }

    private _logger: Logger;

    private _client: Client;

    private _musicQueue: MusicQueue;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
        this._musicQueue = this._botClient.getMusicQueue();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        // check if bot is in a voice channel
        if (!msg.guild.member(this._client.user).voice.channel || this._musicQueue.getQueue().length === 0) {
            this._logger.logError(msg.author.id, `:no_entry_sign: I'm not playing anything.`);
            // check if bot and user are in the same voice channel
        } else if (this._musicQueue.getQueue().length === 1) {
            this._logger.logError(msg.author.id, `:no_entry_sign: Nothing is in the queue`);
        } else if (msg.guild.member(this._client.user).voice.channel && msg.guild.member(this._client.user).voice.channel !== msg.member.voice.channel) {
            this._logger.logError(msg.author.id, `:no_entry_sign: You're not in the same voice channel as the bot.\n Use \`${prefix}leave\` to disconnect the bot.`);
        } else {
            this._musicQueue.shuffleQueue();
            this._logger.logShuffle(msg);
        }
        msg.delete();
    }
}