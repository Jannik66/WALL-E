import { Client, VoiceState } from 'discord.js';
import { BotClient } from '../customInterfaces';
import { Repository } from 'typeorm';
import { VoiceStats } from '../entities/voiceStats';

export default class voiceActivityListener {

    BotClient: BotClient;

    client: Client;

    private _voiceStatsRepository: Repository<VoiceStats>;

    public init(BotClient: BotClient) {
        this.BotClient = BotClient;
        this.client = this.BotClient.getClient();
    }

    public voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
        if (oldState.channel !== newState.channel && !newState.member.user.bot) {
            const timestamp = new Date();
            if (oldState.channel && !newState.channel && oldState.channel.id !== '409006249200582658') {
                this.logLeave(oldState.member.user.id, timestamp);
            } else if (!oldState.channel && newState.channel.id !== '409006249200582658') {
                this.logJoin(oldState.member.user.id, newState.channel.id, timestamp);
            } else {
                this.logSwitch(oldState.member.user.id, newState.channel.id, timestamp);
            }
        }
    }

    public async logJoin(userID: string, voiceChannelID: string, timestamp: Date) {
        await this._voiceStatsRepository.insert({ userID, voiceChannelID, joinedTimeStamp: timestamp });
    }

    public async logSwitch(userID: string, voiceChannelID: string, timestamp: Date) {
        await this.logLeave(userID, timestamp);
        if (voiceChannelID !== '409006249200582658') {
            this.logJoin(userID, voiceChannelID, timestamp);
        }
    }

    public async logLeave(userID: string, timestamp: Date) {
        const statEntry = await this._voiceStatsRepository.findOne({ where: { userID: userID, leftTimeStamp: null } });
        if (statEntry) {
            await this._voiceStatsRepository.update({ id: statEntry.id }, { ...statEntry, leftTimeStamp: timestamp });
        }
    }

    public afterInit() {
        this._voiceStatsRepository = this.BotClient.getDBConnection().getVoiceStatsRepository();
    }

}