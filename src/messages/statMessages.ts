import { BotClient } from '../customInterfaces';
import { Client, TextChannel, Message } from 'discord.js';
import config from '../config';
import { Repository } from 'typeorm';
import { VoiceStats } from '../entities/voiceStats';
import schedule from 'node-schedule';
import moment from 'moment';

export class StatMessages {

    private _botClient: BotClient;

    private _client: Client;

    private _hallOfBDCChannel: TextChannel;

    private _voiceStatsMessage: Message;

    private _voiceStatsRepository: Repository<VoiceStats>;

    private _numbers: string[] = [
        '1⃣',
        '2⃣',
        '3⃣',
        '4⃣',
        '5⃣'
    ]

    public init(bot: BotClient) {
        this._botClient = bot;
        this._client = this._botClient.getClient();
        this._voiceStatsRepository = this._botClient.getDBConnection().getVoiceStatsRepository();
    }

    private _initSchedule() {
        this._updateVoiceStats();
        // Change to akita and do this with an observable?
        schedule.scheduleJob('*/30 * * * *', () => {
            this._updateVoiceStats();
        });
    }

    private async _updateVoiceStats() {
        let voiceStatString = '';
        const now = new Date();
        const voiceDurations: { userID: string, voiceDuration: number }[] = [];
        const voiceStats = await this._voiceStatsRepository.find();
        voiceStats.map((voiceStat) => {
            if (voiceStat.leftTimeStamp === null) {
                voiceStat.leftTimeStamp = now;
                voiceStat.duration = Math.round(moment.duration(moment(now).diff(voiceStat.joinedTimeStamp)).asSeconds());
            }
        });
        for (const voiceStat of voiceStats) {
            if (!voiceDurations.find((voiceDuration) => voiceDuration.userID === voiceStat.userID)) {
                voiceDurations.push({ userID: voiceStat.userID, voiceDuration: 0 })
            }
            voiceDurations.find((voiceDuration) => voiceDuration.userID === voiceStat.userID).voiceDuration += voiceStat.duration;
        }
        voiceDurations.sort((a, b) => b.voiceDuration - a.voiceDuration);
        voiceStatString += '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n';
        voiceStatString += ':loudspeaker: **Voice Stats**\n*(Counting since 22.09.2019)*\n';
        voiceStatString += '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n';

        for (const index in voiceDurations) {
            voiceStatString += `${this._numbers[index]}**${this._client.users.get(voiceDurations[index].userID).username}**\n:timer: ${this._formatDuration(moment.duration(voiceDurations[index].voiceDuration, 'seconds'))}\n\n`;
        }
        voiceStatString += '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
        this._voiceStatsMessage.edit(voiceStatString);
    }

    private _formatDuration(duration: moment.Duration): string {
        let formattedDuration = '';
        formattedDuration += duration.days() > 0 ? `${duration.days()}d ` : '';
        formattedDuration += duration.days() && duration.hours() < 10 ? `0${duration.hours()}h ` : duration.hours() > 0 ? `${duration.hours()}h ` : '';
        formattedDuration += duration.hours() > 0 && duration.minutes() < 10 ? `0${duration.minutes()}m ` : `${duration.minutes()}m `;

        return formattedDuration;
    }

    public async afterInit() {
        this._hallOfBDCChannel = this._client.channels.get(config.hallOfBDCChannelID) as TextChannel;

        await this._hallOfBDCChannel.messages.fetch();
        this._voiceStatsMessage = this._hallOfBDCChannel.messages.get(config.voiceStatsMessageID);
        this._initSchedule();
    }

}