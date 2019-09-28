import { Message, Client } from 'discord.js';
import { Repository } from 'typeorm';
import moment from 'moment';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../logger';
import { VoiceStats } from '../entities/voiceStats';

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

    private _voiceStatsRepository: Repository<VoiceStats>;

    constructor(private _botClient: BotClient) {
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