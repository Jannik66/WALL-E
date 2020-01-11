import { Message, Client } from 'discord.js';
import { Repository } from 'typeorm';
import moment from 'moment';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';

export default class leaveCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 5,
        name: 'restart',
        category: 'Admin',
        description: 'Gracefully restarts the bot.',
        argsRequired: false,
        admin: true,
        aliases: [],
        usage: 'restart',
        examples: ['restart']
    }

    private _client: Client;

    private _logger: Logger;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        await this._logger.logRestart(msg);
        await msg.delete();
        this._client.destroy();
        process.exit();
    }

}