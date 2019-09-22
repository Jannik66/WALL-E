import { BotClient } from '../customInterfaces';
import config from '../config';
import { VoiceChannel } from 'discord.js';

export default class readyListener {

    BotClient: BotClient;

    public init(BotClient: BotClient) {
        this.BotClient = BotClient;
    }

    public async evalReady() {
        console.log(`Logged in as ${this.BotClient.getClient().user.tag}`);
        this.BotClient.afterInit();
        this._checkForVoiceConnections();
    }

    private _checkForVoiceConnections() {
        const now = new Date();
        const BDCGuild = this.BotClient.getClient().guilds.get(config.BDCGuildID);
        let voiceChannels: VoiceChannel[] = [];
        for (const channel of BDCGuild.channels) {
            if (channel[1].type === 'voice') {
                if (channel[1].id !== BDCGuild.afkChannelID) {
                    voiceChannels.push(channel[1] as VoiceChannel);
                }
            }
        }
        for (const voiceChannel of voiceChannels) {
            for (const member of voiceChannel.members) {
                if (!member[1].user.bot) {
                    this.BotClient.getDBConnection().getVoiceStatsRepository().insert({ userID: member[1].id, voiceChannelID: voiceChannel.id, joinedTimeStamp: now });
                }
            }
        }
    }
}