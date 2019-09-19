import { BotClient, Song } from './customInterfaces';
import { Client, TextChannel, Message, MessageEmbed } from 'discord.js';
import config from './config';
import { Repository } from 'typeorm';
import { Songs } from './entities/songs';
import moment from 'moment';
import schedule, { Job } from 'node-schedule';
import { MusicQueue } from './musicQueue';
// @ts-ignore
import progress from 'progress-string';

export class StatusMessages {

    BotClient: BotClient;

    client: Client;

    musicQueue: MusicQueue;

    messageChannel: TextChannel;

    nowPlayingMessage: Message;

    songsLeaderboardMessage: Message;

    djsLeaderboardMessage: Message;

    songsRepository: Repository<Songs>;

    playingNowString: string;

    comingUpString: string;

    messageUpdateJob: Job;

    songDuration: number;

    songEndDate: moment.Moment;

    songPosition: number;

    numbers: string[] = [
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
        this.BotClient = bot;
        this.client = this.BotClient.getClient();
    }

    public async afterInit() {
        this.musicQueue = this.BotClient.getMusicQueue();
        this._listenToQueue();

        this.songsRepository = this.BotClient.getDBConnection().getSongsRepository();
        this.messageChannel = this.client.channels.get(config.wallEChannelID) as TextChannel;

        await this.messageChannel.messages.fetch();
        this.nowPlayingMessage = this.messageChannel.messages.get(config.nowPlayingMessageID);
        this.songsLeaderboardMessage = this.messageChannel.messages.get(config.songLeaderboardMessageID);
        this.djsLeaderboardMessage = this.messageChannel.messages.get(config.djLeaderboardMessageID);
    }

    private _listenToQueue() {
        this.musicQueue.on('songAdded', (queue: Array<Song>) => {
            if (this.messageUpdateJob) {
                this.messageUpdateJob.cancel();
            }
            this.songEndDate = moment().add(queue[0].length, 'seconds');
            this._updateNowPlayingSong(queue);
        });
        this.musicQueue.on('proceededToNextSong', (queue: Array<Song>) => {
            this.messageUpdateJob.cancel();
            this.songEndDate = moment().add(queue[0].length, 'seconds');
            this._updateNowPlayingSong(queue);
        });
        this.musicQueue.on('queueCleared', (queue: Array<Song>) => {
            if (this.messageUpdateJob) {
                this.messageUpdateJob.cancel();
            }
            this._removeSongPlaying();
        });
    }

    public _updateNowPlayingSong(queue: Array<Song>) {
        this.playingNowString = '';
        this.comingUpString = '';

        this.playingNowString += `<:disc:622750303862915082> Now playing <:disc:622750303862915082>\n\n`;
        this.playingNowString += `:dvd: **${queue[0].name}**\n`;
        this.playingNowString += `https://youtu.be/${queue[0].id}\n\n`;

        this.songDuration = parseInt(queue[0].length);

        this.comingUpString = '';

        if (queue[1]) {
            this.comingUpString += `\n\nComing up:\n`;
            for (let song in queue) {
                if (song === '1') {
                    this.comingUpString += `:one: ${queue[parseInt(song)].name}\n`;
                } else if (song === '2') {
                    this.comingUpString += `:two: ${queue[parseInt(song)].name}\n`;
                } else if (song === '3') {
                    this.comingUpString += `:three: ${queue[parseInt(song)].name}\n`;
                }
            }
        }

        this.messageUpdateJob = schedule.scheduleJob('*/2 * * * * *', () => {
            let songProgress = '';
            let songPositionSeconds = this.songDuration - moment.duration(this.songEndDate.diff(moment())).asSeconds();
            let songPositionString = `[${moment.duration(songPositionSeconds, 'seconds').minutes()}:`;
            songPositionString += `${moment.duration(songPositionSeconds, 'seconds').seconds() > 9 ? moment.duration(songPositionSeconds, 'seconds').seconds() : '0' + moment.duration(songPositionSeconds, 'seconds').seconds()}] `;

            songProgress += songPositionString;

            let bar = progress({
                width: 20,
                total: this.songDuration,
                incomplete: '─',
                complete: '▬',
                style: (complete: string, incomplete: string) => {
                    return complete + '●' + incomplete;
                }
            });
            songProgress += bar(songPositionSeconds);

            let songDurationString = ` [${moment.duration(this.songDuration, 'seconds').minutes()}:`;
            songDurationString += `${moment.duration(this.songDuration, 'seconds').seconds() > 9 ? moment.duration(this.songDuration, 'seconds').seconds() : '0' + moment.duration(this.songDuration, 'seconds').seconds()}]`;
            songProgress += songDurationString;

            let nowPlaying = this.playingNowString + '`' + songProgress + '`' + this.comingUpString;
            this.nowPlayingMessage.edit(nowPlaying);
        });
    }

    public pause() {
        this.messageUpdateJob.cancel();
        this.songPosition = this.songDuration - moment.duration(this.songEndDate.diff(moment())).asSeconds();
    }

    public resume() {
        this.songEndDate = moment().add(this.songDuration - this.songPosition, 'seconds');
        this._updateNowPlayingSong(this.musicQueue.getQueue());
    }

    private _removeSongPlaying() {
        this.nowPlayingMessage.edit(`:no_entry_sign: No Song playing...`);
    }

    public async updateSongLeaderboard() {
        let topSongs: { id: string, name: string, totalPlayed: number }[] = await this.songsRepository
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
            songLeaderboard += `\n${this.numbers[parseInt(topSong)]} **${topSongs[parseInt(topSong)].name}**`;
            songLeaderboard += `\n:arrows_counterclockwise: ${topSongs[parseInt(topSong)].totalPlayed}`;
            songLeaderboard += `\n:link: https://youtu.be/${topSongs[parseInt(topSong)].id}`;
            songLeaderboard += `\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
        }
        if (topSongs.length === 0) {
            songLeaderboard += 'No songs in the database...';
        }
        this.songsLeaderboardMessage.edit(songLeaderboard);
    }

    public async updateDJLeaderboard() {
        let topDjs: { userID: string, totalPlayed: number }[] = await this.songsRepository
            .createQueryBuilder('songs')
            .groupBy('songs.userID')
            .select('songs.userID', 'userID')
            .addSelect('SUM(songs.timesPlayed)', 'totalPlayed')
            .orderBy('SUM(songs.timesPlayed)', 'DESC')
            .limit(5)
            .getRawMany();
        let djLeaderboard = `:tada:**The best DJ's**:tada:\n`;
        for (let topDj in topDjs) {
            let topSong: { name: string, timesPlayed: number } = await this.songsRepository
                .createQueryBuilder('songs')
                .select('songs.name', 'name')
                .addSelect('songs.timesPlayed', 'timesPlayed')
                .orderBy('songs.timesPlayed', 'DESC')
                .where(`songs.userID = ${topDjs[topDj].userID}`)
                .getRawOne();
            let username = this.client.users.get(topDjs[parseInt(topDj)].userID).username;
            djLeaderboard += `\n${this.numbers[parseInt(topDj)]} **${username}**`;
            djLeaderboard += `\n:arrows_counterclockwise: ${topDjs[parseInt(topDj)].totalPlayed}`;
            djLeaderboard += `\n**__Most Played:__**\n${topSong.timesPlayed} :arrows_counterclockwise: _${topSong.name}_  `;
            djLeaderboard += `\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;

        }
        if (topDjs.length === 0) {
            djLeaderboard += 'No djs in the database...';
        }
        this.djsLeaderboardMessage.edit(djLeaderboard);
    }

}