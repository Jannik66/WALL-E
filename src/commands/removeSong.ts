import { Message, Client } from 'discord.js';
import { MusicQueue } from '../audio/musicQueue';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';

export default class restartCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 23,
        name: 'removesong',
        category: 'Music',
        description: 'Remove a song from the queue',
        argsRequired: true,
        admin: false,
        aliases: ['rs'],
        usage: 'removesong {place in queue}',
        examples: ['removesong 2']
    }

    private _client: Client;

    private _logger: Logger;

    private _musicQueue: MusicQueue;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
        this._musicQueue = this._botClient.getMusicQueue();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        if (!parseInt(args[0])) {
            this._logger.logError(msg.author.id, `:no_entry_sign: Could not parse argument to number.`);

        }
        const index = parseInt(args[0]);
        if (index < 1) {
            this._logger.logError(msg.author.id, `:no_entry_sign: Number has to be greater than 0.`);
        }
        if (!msg.guild.member(this._client.user).voice.channel || this._musicQueue.getQueue().length <= index) {
            this._logger.logError(msg.author.id, `:no_entry_sign: I don't have anything in the queue at this place.`);
            // check if bot and user are in the same voice channel
        } else if (msg.guild.member(this._client.user).voice.channel && msg.guild.member(this._client.user).voice.channel !== msg.member.voice.channel) {
            this._logger.logError(msg.author.id, `:no_entry_sign: You're not in the same voice channel as the bot.\n Use \`${prefix}leave\` to disconnect the bot.`);
        } else {
            this._musicQueue.removeSongAt(index);
            this._logger.logSuccess(msg, `Removed song at index ${index} from queue.`);
        }
        msg.delete();
    }

}