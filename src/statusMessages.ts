import { BotClient, Song } from './customInterfaces';
import { Client, TextChannel, Message, MessageEmbed } from 'discord.js';
import config from './config';
import { Repository } from 'typeorm';
import { Songs } from './entities/songs';
import moment from 'moment';
import schedule, { Job } from 'node-schedule';
import { MusicQueue } from './audio/musicQueue';
// @ts-ignore
import progress from 'progress-string';

export class StatusMessages {

    private _botClient: BotClient;

    private _client: Client;

    private _musicQueue: MusicQueue;

    private _messageChannel: TextChannel;

    private _nowPlayingMessage: Message;

    private _songsLeaderboardMessage: Message;

    private _djsLeaderboardMessage: Message;

    private _songsRepository: Repository<Songs>;

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

    public init(bot: BotClient) {
        this._botClient = bot;
        this._client = this._botClient.getClient();
        this._musicQueue = this._botClient.getMusicQueue();
        this._songsRepository = this._botClient.getDBConnection().getSongsRepository();
    }

    public async afterInit() {
        this._listenToQueue();

        this._messageChannel = this._client.channels.get(config.wallEChannelID) as TextChannel;

        await this._messageChannel.messages.fetch();
        this._nowPlayingMessage = this._messageChannel.messages.get(config.nowPlayingMessageID);
        this._songsLeaderboardMessage = this._messageChannel.messages.get(config.songLeaderboardMessageID);
        this._djsLeaderboardMessage = this._messageChannel.messages.get(config.djLeaderboardMessageID);
    }

    private _listenToQueue() {
        this._musicQueue.on('songAdded', (queue: Array<Song>) => {
            if (this._messageUpdateJob) {
                this._messageUpdateJob.cancel();
            }
            if (queue.length === 1) {
                this._songEndDate = moment().add(queue[0].length, 'seconds');
            }
            this._updateNowPlayingSong(queue);
        });
        this._musicQueue.on('proceededToNextSong', (queue: Array<Song>) => {
            this._messageUpdateJob.cancel();
            this._songEndDate = moment().add(queue[0].length, 'seconds');
            this._updateNowPlayingSong(queue);
        });
        this._musicQueue.on('queueCleared', (queue: Array<Song>) => {
            if (this._messageUpdateJob) {
                this._messageUpdateJob.cancel();
            }
            this._removeSongPlaying();
        });
    }

    public _updateNowPlayingSong(queue: Array<Song>) {
        this._playingNowString = '';

        this._playingNowString += `<:disc:622750303862915082> Now playing <:disc:622750303862915082>\n\n`;
        this._playingNowString += `:dvd: **${queue[0].name}**\n`;
        this._playingNowString += `https://youtu.be/${queue[0].id}\n\n`;

        this._songDuration = parseInt(queue[0].length);

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

    private _generateQueueString(queue: Array<Song>) {
        let comingQueue = [...queue];
        comingQueue.shift();
        let duration = moment.duration(comingQueue.map((value) => parseInt(value.length)).reduce((a, b) => a + b, 0), 'seconds');
        let durationString = this._formatDuration(duration);
        let comingUpString = comingQueue.length > 0 ? `\n\n**Coming up** | Total Duration: **${durationString}**\n` : '';

        for (let song of comingQueue) {
            comingUpString += `\n▬ ${song.name} (**${this._formatDuration(moment.duration(parseInt(song.length), 'seconds'))}**)`;
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
        let topSongs: { id: string, name: string, totalPlayed: number }[] = await this._songsRepository
            .createQueryBuilder('songs')
            .groupBy('songs.id')
            .select('songs.id', 'id')
            .addSelect('songs.name', 'name')
            .addSelect('SUM(songs.timesPlayed)', 'totalPlayed')
            .orderBy('SUM(songs.timesPlayed)', 'DESC')
            .limit(10)
            .getRawMany();
        let songLeaderboard = `:dvd:**Most played songs**:dvd:\n`;
        for (let topSong in topSongs) {
            songLeaderboard += `\n${this._numbers[parseInt(topSong)]} **${topSongs[parseInt(topSong)].name}**`;
            songLeaderboard += `\n:arrows_counterclockwise: ${topSongs[parseInt(topSong)].totalPlayed}`;
            songLeaderboard += `\n:link: https://youtu.be/${topSongs[parseInt(topSong)].id}`;
            songLeaderboard += `\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
        }
        if (topSongs.length === 0) {
            songLeaderboard += 'No songs in the database...';
        }
        this._songsLeaderboardMessage.edit(songLeaderboard);
    }

    public async updateDJLeaderboard() {
        let topDjs: { userID: string, totalPlayed: number }[] = await this._songsRepository
            .createQueryBuilder('songs')
            .groupBy('songs.userID')
            .select('songs.userID', 'userID')
            .addSelect('SUM(songs.timesPlayed)', 'totalPlayed')
            .orderBy('SUM(songs.timesPlayed)', 'DESC')
            .limit(5)
            .getRawMany();
        let djLeaderboard = `:tada:**The best DJ's**:tada:\n`;
        for (let topDj in topDjs) {
            let topSong: { name: string, timesPlayed: number } = await this._songsRepository
                .createQueryBuilder('songs')
                .select('songs.name', 'name')
                .addSelect('songs.timesPlayed', 'timesPlayed')
                .orderBy('songs.timesPlayed', 'DESC')
                .where(`songs.userID = ${topDjs[topDj].userID}`)
                .getRawOne();
            let username = this._client.users.get(topDjs[parseInt(topDj)].userID).username;
            djLeaderboard += `\n${this._numbers[parseInt(topDj)]} **${username}**`;
            djLeaderboard += `\n:arrows_counterclockwise: ${topDjs[parseInt(topDj)].totalPlayed}`;
            djLeaderboard += `\n**__Most Played:__**\n${topSong.timesPlayed} :arrows_counterclockwise: _${topSong.name}_  `;
            djLeaderboard += `\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;

        }
        if (topDjs.length === 0) {
            djLeaderboard += 'No djs in the database...';
        }
        this._djsLeaderboardMessage.edit(djLeaderboard);
    }

}