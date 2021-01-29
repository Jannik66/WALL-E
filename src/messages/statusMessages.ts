import { Client, TextChannel, Message } from 'discord.js';
import { Repository } from 'typeorm';
import moment from 'moment';
import schedule, { Job } from 'node-schedule';
// @ts-ignore
import progress from 'progress-string';

import config from '../config';
import { BotClient, QueueSong } from '../customInterfaces';
import { MusicQueue } from '../audio/musicQueue';
import { UserSong } from '../entities/userSong';
import { VoiceStat } from '../entities/voiceStat';

export class StatusMessages {

    private _client: Client;

    private _musicQueue: MusicQueue;

    private _dashboardChannel: TextChannel;
    private _hallOfBDCChannel: TextChannel;

    private _nowPlayingMessage: Message;

    private _songsLeaderboardMessage: Message;

    private _djsLeaderboardMessage: Message;

    private _voiceStatMessage: Message;

    private _userSongRepository: Repository<UserSong>;

    private _voiceStatRepository: Repository<VoiceStat>;

    private _playingNowString: string;

    private _comingUpString: string;

    private _messageUpdateJob: Job;

    private _songDuration: number;

    private _songEndDate: moment.Moment;

    private _songPosition: number;

    private _numbers: string[] = [
        '1⃣',
        '2⃣',
        '3⃣',
        '4⃣',
        '5⃣',
        '6⃣',
        '7⃣',
        '8⃣',
        '9⃣',
        ':keycap_ten:'
    ]

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._musicQueue = this._botClient.getMusicQueue();
        this._userSongRepository = this._botClient.getDatabase().getUserSongRepository();
        this._voiceStatRepository = this._botClient.getDatabase().getVoiceStatRepository();
    }

    public async afterInit() {
        this._listenToQueue();

        this._dashboardChannel = this._client.channels.cache.get(config.dashboardChannelID) as TextChannel;
        this._hallOfBDCChannel = this._client.channels.cache.get(config.hallOfBDCChannelID) as TextChannel;

        await this._dashboardChannel.messages.fetch();
        await this._hallOfBDCChannel.messages.fetch();
        this._nowPlayingMessage = this._dashboardChannel.messages.cache.get(config.nowPlayingMessageID);
        this._songsLeaderboardMessage = this._dashboardChannel.messages.cache.get(config.songLeaderboardMessageID);
        this._djsLeaderboardMessage = this._dashboardChannel.messages.cache.get(config.djLeaderboardMessageID);
        this._voiceStatMessage = this._hallOfBDCChannel.messages.cache.get(config.voiceStatMessageID);

        this._scheduleVoiceStatMsgUpdate();
    }

    private _listenToQueue() {
        this._musicQueue.on('songAdded', (queue: Array<QueueSong>) => {
            if (this._messageUpdateJob) {
                this._messageUpdateJob.cancel();
            }
            if (queue.length === 1) {
                this._songEndDate = moment().add(queue[0].length, 'seconds');
            }
            this._updateNowPlayingSong(queue);
        });
        this._musicQueue.on('proceededToNextSong', (queue: Array<QueueSong>) => {
            this._messageUpdateJob.cancel();
            this._songEndDate = moment().add(queue[0].length, 'seconds');
            this._updateNowPlayingSong(queue);
        });
        this._musicQueue.on('queueShuffled', (queue: Array<QueueSong>) => {
            this._messageUpdateJob.cancel();
            this._updateNowPlayingSong(queue);
        });
        this._musicQueue.on('songRemoved', (queue: Array<QueueSong>) => {
            this._messageUpdateJob.cancel();
            this._updateNowPlayingSong(queue);
        });
        this._musicQueue.on('queueCleared', () => {
            if (this._messageUpdateJob) {
                this._messageUpdateJob.cancel();
            }
            this._removeSongPlaying();
        });
        this._musicQueue.on('upcomingQueueCleared', (queue: Array<QueueSong>) => {
            this._messageUpdateJob.cancel();
            this._updateNowPlayingSong(queue);
        });
        this._musicQueue.on('updatedLoop', (queue: Array<QueueSong>) => {
            this._messageUpdateJob.cancel();
            this._updateNowPlayingSong(queue);
        });
    }

    private _scheduleVoiceStatMsgUpdate() {
        schedule.scheduleJob('0 * * * *', () => {
            this._updateVoiceStatMsg();
        })
    }

    private async _updateVoiceStatMsg() {
        let messageString = '';
        messageString += `:loud_sound: Voice Stats :loud_sound:\n_(Since 29.05.2020)_\n\n`;

        const voiceMembers: { min: number, userId: string }[] = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'min')
            .addSelect('voiceStat.userID', 'userId')
            .groupBy('voiceStat.userID')
            .orderBy('min', 'DESC')
            .getRawMany();

        for (const i in voiceMembers) {
            const username = this._client.users.cache.get(voiceMembers[i].userId).username;
            messageString += `\n${this._numbers[i]} **${username}**`;
            messageString += `\n:stopwatch: ${this._formatVoiceMinutes(voiceMembers[i].min)}`;
            messageString += `\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
        }

        this._voiceStatMessage.edit(messageString);
    }

    public _updateNowPlayingSong(queue: Array<QueueSong>) {
        this._playingNowString = '';

        this._playingNowString += `<:disc:622750303862915082> Now playing <:disc:622750303862915082>\n\n`;
        if (this._musicQueue.loop.enabled && !this._musicQueue.loop.entireQueue) {
            this._playingNowString += `:repeat_one:`;
        }
        this._playingNowString += `:dvd: **${queue[0].name}**\n`;
        this._playingNowString += `https://youtu.be/${queue[0].id}\n\n`;

        this._songDuration = queue[0].length;

        this._comingUpString = this._generateQueueString(queue);

        this._messageUpdateJob = schedule.scheduleJob('*/3 * * * * *', () => {
            let songProgress = '';
            let songPositionSeconds = this._songDuration - moment.duration(this._songEndDate.diff(moment())).asSeconds();
            let songPositionString = `[${this._formatDuration(moment.duration(songPositionSeconds, 'seconds'))}] `;

            songProgress += songPositionString;

            let bar = progress({
                width: 20,
                total: this._songDuration,
                incomplete: '─',
                complete: '▬',
                style: (complete: string, incomplete: string) => {
                    return complete + '●' + incomplete;
                }
            });
            songProgress += bar(songPositionSeconds);

            let songDurationString = ` [${this._formatDuration(moment.duration(this._songDuration, 'seconds'))}]`;
            songProgress += songDurationString;

            let nowPlaying = this._playingNowString + '`' + songProgress + '`' + this._comingUpString;
            this._nowPlayingMessage.edit(nowPlaying);
        });
    }

    private _formatDuration(duration: moment.Duration): string {
        let formattedDuration = '';
        formattedDuration += duration.hours() > 0 ? `${duration.hours()}:` : '';
        formattedDuration += duration.hours() > 0 && duration.minutes() < 10 ? `0${duration.minutes()}:` : `${duration.minutes()}:`;
        formattedDuration += duration.seconds() > 9 ? duration.seconds() : `0${duration.seconds()}`;

        return formattedDuration;
    }

    // format mintutes to a better readable format
    private _formatVoiceMinutes(minutes: number) {
        let duration = moment.duration(minutes, 'minutes');
        return (
            (Math.floor(duration.asMonths()) > 0 ? `${Math.floor(duration.asMonths())}M ` : '') +
            (Math.floor(duration.asMonths()) > 0 || duration.days() > 0 ? `${duration.days()}d ` : '') +
            (duration.hours() > 0 || duration.days() > 0 || Math.floor(duration.asMonths()) > 0 ? `${duration.hours()}h ` : '') +
            `${duration.minutes()}m`
        );
    }

    private _generateQueueString(queue: Array<QueueSong>) {
        let comingQueue = [...queue];
        comingQueue.shift();
        let duration = moment.duration(comingQueue.map((value) => value.length).reduce((a, b) => a + b, 0), 'seconds');
        let durationString = this._formatDuration(duration);
        let comingUpString = comingQueue.length > 0 ? `\n\n${this._musicQueue.loop.entireQueue ? ':repeat: ' : ''}**Coming up** | Total Duration: **${durationString}**\n` : '';

        if (comingQueue.length > 20) {
            for (let i = 0; i < 20; i++) {
                comingUpString += `\n▬ ${comingQueue[i].name} (**${this._formatDuration(moment.duration(comingQueue[i].length, 'seconds'))}**)`;
            }
            comingUpString += `\n\n+ ${comingQueue.length - 20} more...`;
        } else {
            for (let song of comingQueue) {
                comingUpString += `\n▬ ${song.name} (**${this._formatDuration(moment.duration(song.length, 'seconds'))}**)`;
            }
        }

        return comingUpString;
    }

    public pause() {
        this._messageUpdateJob.cancel();
        this._songPosition = this._songDuration - moment.duration(this._songEndDate.diff(moment())).asSeconds();
    }

    public resume() {
        this._songEndDate = moment().add(this._songDuration - this._songPosition, 'seconds');
        this._updateNowPlayingSong(this._musicQueue.getQueue());
    }

    private _removeSongPlaying() {
        this._nowPlayingMessage.edit(`:no_entry_sign: No Song playing...`);
    }

    public async updateSongLeaderboard() {
        let topSongsAllTime: { id: string, name: string, totalPlayed: number }[] = await this._userSongRepository
            .createQueryBuilder('userSong')
            .leftJoin('userSong.song', 'song')
            .groupBy('userSong.song')
            .select('song.id', 'id')
            .addSelect('song.name', 'name')
            .addSelect('count(*)', 'totalPlayed')
            .orderBy('count(*)', 'DESC')
            .limit(3)
            .getRawMany();

        let songLeaderboard = `:trophy:**Most played songs of all time**:trophy:\n`;
        for (let topSong in topSongsAllTime) {
            songLeaderboard += `\n${this._numbers[topSong]} **${topSongsAllTime[topSong].name}**`;
            songLeaderboard += `\n:arrows_counterclockwise: ${topSongsAllTime[topSong].totalPlayed}`;
            songLeaderboard += `\n:link: https://youtu.be/${topSongsAllTime[topSong].id}`;
            songLeaderboard += `\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
        }
        songLeaderboard += '\n\n';

        const monthBeginDate = moment().startOf('month').utcOffset(0);
        let topSongsThisMonth: { id: string, name: string, totalPlayed: number }[] = await this._userSongRepository
            .createQueryBuilder('userSong')
            .leftJoin('userSong.song', 'song')
            .groupBy('userSong.song')
            .select('song.id', 'id')
            .addSelect('song.name', 'name')
            .addSelect('count(*)', 'totalPlayed')
            .where("userSong.timestamp > :beginOfMonth", { beginOfMonth: monthBeginDate.toISOString() })
            .orderBy('count(*)', 'DESC')
            .limit(10)
            .getRawMany();

        songLeaderboard += `:dvd:**Most played songs of the month ${monthBeginDate.add(1, 'day').format('MMMM')}**:dvd:\n`;
        for (let topSong in topSongsThisMonth) {
            songLeaderboard += `\n${this._numbers[topSong]} **${topSongsThisMonth[topSong].name}**`;
            songLeaderboard += `\n:arrows_counterclockwise: ${topSongsThisMonth[topSong].totalPlayed}`;
            songLeaderboard += `\n:link: https://youtu.be/${topSongsThisMonth[topSong].id}`;
            songLeaderboard += `\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
        }

        if (topSongsAllTime.length === 0) {
            songLeaderboard += 'No songs in the database...';
        }
        this._songsLeaderboardMessage.edit(songLeaderboard);
    }

    public async updateDJLeaderboard() {
        let topDjs: { userID: string, totalPlayed: number }[] = await this._userSongRepository
            .createQueryBuilder('userSong')
            .leftJoin('userSong.user', 'user')
            .groupBy('user.id')
            .select('user.id', 'userID')
            .addSelect('count(*)', 'totalPlayed')
            .orderBy('count(*)', 'DESC')
            .limit(5)
            .getRawMany();
        let djLeaderboard = `:tada:**The best DJ's**:tada:\n`;
        for (let topDj in topDjs) {
            let topSong: { name: string, id: string, totalPlayed: number } = await this._userSongRepository
                .createQueryBuilder('userSong')
                .leftJoin('userSong.song', 'song')
                .leftJoin('userSong.user', 'user')
                .select('song.name', 'name')
                .addSelect('song.id', 'id')
                .addSelect('count(*)', 'totalPlayed')
                .groupBy('song.id')
                .orderBy('count(*)', 'DESC')
                .where(`user.id = ${topDjs[topDj].userID}`)
                .getRawOne();
            let username = this._client.users.cache.get(topDjs[topDj].userID).username;
            djLeaderboard += `\n${this._numbers[topDj]} **${username}**`;
            djLeaderboard += `\n:arrows_counterclockwise: ${topDjs[topDj].totalPlayed}`;
            djLeaderboard += `\n**__Most Played:__**\n${topSong.totalPlayed} :arrows_counterclockwise: _${topSong.name}_  `;
            djLeaderboard += `\n:link: https://youtu.be/${topSong.id}`
            djLeaderboard += `\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;

        }
        if (topDjs.length === 0) {
            djLeaderboard += 'No djs in the database...';
        }
        this._djsLeaderboardMessage.edit(djLeaderboard);
    }

}