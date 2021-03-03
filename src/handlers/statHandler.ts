import { Client, VoiceChannel } from 'discord.js';
import { Repository } from 'typeorm';
import ns from 'node-schedule';
import moment from 'moment';

import { VoiceStat } from '../entities/voiceStat';
import { WALLEBot } from '../bot';

export class StatHandler {

    private _client: Client;

    private _voiceStatRepository: Repository<VoiceStat>;

    constructor(private _botClient: WALLEBot) {
        this._client = this._botClient.getClient();
        this._voiceStatRepository = this._botClient.getDatabase().getVoiceStatRepository();
    }

    public init() {
        this._initVoiceChannelStats();
    }

    private _initVoiceChannelStats() {
        // check voice connections every minute (to provide detailed voice stats)
        ns.scheduleJob('0 * * * * *', () => {
            const voiceChannels = this._client.channels.cache.array().filter((c: any) => {
                return c.guild &&
                    c.guild.id === this._botClient.getConfig().BDCGuildID &&
                    c.type === 'voice' &&
                    !this._botClient.getConfig().excludedVoiceChannelIds.includes(c.id);
            });
            for (const c of voiceChannels) {
                const voiceChannel = c as VoiceChannel;
                if (voiceChannel.members.filter(m => !m.user.bot).size > 1) {
                    voiceChannel.members.each(m => {
                        if (m.user.bot) return;
                        this._voiceStatRepository.insert({ channelID: voiceChannel.id, userID: m.id, timestamp: moment().utcOffset(0).toDate() });
                    });
                }
            }
        });
    }
}
