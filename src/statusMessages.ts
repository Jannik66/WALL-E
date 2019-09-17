import { BotClient } from './customInterfaces';
import { Client, TextChannel, Message, MessageEmbed } from 'discord.js';
import config from './config';
import { Repository } from 'typeorm';
import { Songs } from './entities/songs';

export class StatusMessages {

    BotClient: BotClient;

    client: Client;

    messageChannel: TextChannel;

    nowPlayingMessage: Message;

    songsLeaderboardMessage: Message;

    djsLeaderboardMessage: Message;

    songsRepository: Repository<Songs>;

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
        this.songsRepository = this.BotClient.getDBConnection().getSongsRepository();
        this.messageChannel = this.client.channels.get(config.wallEChannelID) as TextChannel;

        await this.messageChannel.messages.fetch();
        this.nowPlayingMessage = this.messageChannel.messages.get(config.nowPlayingMessageID);
        this.songsLeaderboardMessage = this.messageChannel.messages.get(config.songLeaderboardMessageID);
        this.djsLeaderboardMessage = this.messageChannel.messages.get(config.djLeaderboardMessageID);
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

    public changeSongPlaying(queue: { name: string, requester: string, id: string }[]) {
        let status = '';
        status += `<:disc:622750303862915082> Now playing <:disc:622750303862915082>\n\n`;
        status += `:dvd: **${queue[0].name}**\n`;
        status += `https://youtu.be/${queue[0].id}`;

        if (queue[1]) {
            status += `\n\nComing up:\n`;
            for (let song in queue) {
                if (song === '1') {
                    status += `:one: ${queue[parseInt(song)].name}\n`;
                } else if (song === '2') {
                    status += `:two: ${queue[parseInt(song)].name}\n`;
                } else if (song === '3') {
                    status += `:three: ${queue[parseInt(song)].name}\n`;
                }
            }
        }
        this.nowPlayingMessage.edit(status);
    }

    public removeSongPlaying() {
        this.client.user.setActivity();
    }

}