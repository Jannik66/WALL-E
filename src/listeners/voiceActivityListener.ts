import { Client, VoiceState, GuildMember, Collection } from 'discord.js';
import { BotClient } from '../customInterfaces';
import { Repository } from 'typeorm';
import { VoiceStats } from '../entities/voiceStats';
import moment = require('moment');

export default class voiceActivityListener {

    private _client: Client;

    private _voiceStatsRepository: Repository<VoiceStats>;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._voiceStatsRepository = this._botClient.getDBConnection().getVoiceStatsRepository();
    }

    public async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
        if (oldState.guild.member(this._client.user.id).voice.channel && oldState.guild.member(this._client.user.id).voice.channel.members.filter((member) => !member.user.bot).size === 0) {
            oldState.guild.member(this._client.user.id).voice.channel.leave();
            this._botClient.getLogger().logLeave(this._client.user);
        }

        const UserID = oldState.member.user.id;
        let filteredOldVoiceChannelMembers: Collection<string, GuildMember>;
        let filteredNewVoiceChannelMembers: Collection<string, GuildMember>;
        if (oldState.channel) {
            filteredOldVoiceChannelMembers = oldState.channel.members.filter((member) => !member.user.bot) as Collection<string, GuildMember>;
        }
        if (newState.channel) {
            filteredNewVoiceChannelMembers = newState.channel.members.filter((member) => !member.user.bot) as Collection<string, GuildMember>;
        }
        if (oldState.channel !== newState.channel && !newState.member.user.bot) {
            const timestamp = new Date();
            if (oldState.channel && !newState.channel && oldState.channel.id !== '409006249200582658') {
                this.logLeave(UserID, timestamp);
                if (filteredOldVoiceChannelMembers.size < 2) {
                    const otherMembers = filteredOldVoiceChannelMembers.filter((member) => member.user.id !== UserID);
                    for (const member of otherMembers) {
                        this.logLeave(member[1].user.id, timestamp);
                    }
                }
            } else if (!oldState.channel && newState.channel.id !== '409006249200582658' && filteredNewVoiceChannelMembers.size >= 2) {
                this.logJoin(UserID, newState.channel.id, timestamp);
                if (filteredNewVoiceChannelMembers.size === 2) {
                    const otherMembers = filteredNewVoiceChannelMembers.filter((member) => member.user.id !== UserID);
                    for (const member of otherMembers) {
                        this.logJoin(member[1].user.id, newState.channel.id, timestamp);
                    }
                }
            } else if (oldState.channel && newState.channel) {
                await this.logLeave(UserID, timestamp);
                if (filteredOldVoiceChannelMembers.size < 2) {
                    const otherMembers = filteredOldVoiceChannelMembers.filter((member) => member.user.id !== UserID);
                    for (const member of otherMembers) {
                        this.logLeave(member[1].user.id, timestamp);
                    }
                }
                if (filteredNewVoiceChannelMembers.size >= 2) {
                    if (newState.channel.id !== '409006249200582658') {
                        this.logJoin(UserID, newState.channel.id, timestamp);
                        if (filteredNewVoiceChannelMembers.size === 2) {
                            const otherMembers = filteredNewVoiceChannelMembers.filter((member) => member.user.id !== UserID);
                            for (const member of otherMembers) {
                                this.logJoin(member[1].user.id, newState.channel.id, timestamp);
                            }
                        }
                    }
                }
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
            const duration = Math.round(moment.duration(moment(timestamp).diff(statEntry.joinedTimeStamp)).asSeconds());
            await this._voiceStatsRepository.update({ id: statEntry.id }, { leftTimeStamp: timestamp, duration });
        }
    }

}