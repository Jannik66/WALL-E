import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { Logger } from '../logger';
import { Repository } from 'typeorm';
import { VoiceStats } from '../entities/voiceStats';
import moment = require('moment');

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

    private _botClient: BotClient;

    private _client: Client;

    private _logger: Logger;

    private _voiceStatsRepository: Repository<VoiceStats>;

    public initCommand(botClient: BotClient) {
        this._botClient = botClient;
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
        this._voiceStatsRepository = this._botClient.getDBConnection().getVoiceStatsRepository();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        await this._logger.logRestart(msg);
        await msg.delete();
        await this._clearSongRepository();
        this._client.destroy();
        process.exit();
    }

    private async _clearSongRepository() {
        const now = new Date();
        const stillConnected = await this._voiceStatsRepository.find({ where: { leftTimeStamp: null } });
        for (const connection of stillConnected) {
            const duration = Math.round(moment.duration(moment(now).diff(connection.joinedTimeStamp)).asSeconds());
            await this._voiceStatsRepository.update({ id: connection.id }, { leftTimeStamp: now, duration });
        }
    }

}