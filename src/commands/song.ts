import { Message, Client, MessageEmbed } from 'discord.js';
import { Repository } from 'typeorm';
import moment from 'moment';
import * as ytdl from 'ytdl-core';

import { BotCommand, BotClient } from '../customInterfaces';
import { Song } from '../entities/song';
import { UserSong } from '../entities/userSong';
import { Logger } from '../messages/logger';

export default class songCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 24,
        name: 'song',
        category: 'Information',
        description: 'Get info about a specific song.',
        argsRequired: true,
        admin: false,
        aliases: [],
        usage: 'song {Youtube-SongID or link}',
        examples: ['song GMb02tAqDRM', 'song https://youtu.be/GMb02tAqDRM']
    }

    private _client: Client;

    private _logger: Logger;

    private _songRepository: Repository<Song>;

    private _userSongRepository: Repository<UserSong>;

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
        this._logger = this._botClient.getLogger();

        this._songRepository = this._botClient.getDatabase().getConnection().getRepository(Song);
        this._userSongRepository = this._botClient.getDatabase().getConnection().getRepository(UserSong);
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        let videoId: string;
        try {
            videoId = ytdl.getVideoID(args[0]);
        } catch {
            this._sendMessage(msg, `:no_entry_sign: Couldn't find video ID from \`${args[0]}\``);
            return;
        }

        const embed = new MessageEmbed();
        embed.setColor(0xEDD5BD);
        embed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        embed.setFooter('Pridefully serving the BDC-Server.');

        const song = await this._songRepository.findOne({ where: { id: videoId } });
        if (!song) {
            this._sendMessage(msg, ':no_entry_sign: Song not found in the WALL-E database.');
            return;
        }
        embed.setTitle(`:musical_note: ${song.name}`);

        let description = '';
        description += `:link: https://youtu.be/${song.id}`;

        const duration = moment.duration(song.length, 'seconds');
        description += `\n:timer: ${this._formatDuration(duration)}`;

        let playsWithCount = await this._userSongRepository.findAndCount({ where: { song }, order: { timestamp: 'DESC' } });
        description += `\n:repeat: ${playsWithCount[1]}`;

        embed.setDescription(description);

        let plays: { userID: string, totalPlayed: number }[] = await this._userSongRepository
            .createQueryBuilder('userSong')
            .leftJoin('userSong.user', 'user')
            .leftJoin('userSong.song', 'song')
            .groupBy('user.id')
            .select('user.id', 'userID')
            .addSelect('count(*)', 'totalPlayed')
            .orderBy('count(*)', 'DESC')
            .where(`song.id = '${song.id}'`)
            .getRawMany();

        let playedByField = '';

        for (let i = 0; i < plays.length; i++) {
            playedByField += `${this._numbers[i]} **${this._client.users.cache.get(plays[i].userID).username}** - \`${plays[i].totalPlayed}x\`\n`;
        }

        embed.addField('Played by', playedByField);

        const playsWithTimestamp = playsWithCount[0].filter(play => play.timestamp);

        embed.addField('Last played', `:calendar_spiral: \`${moment(playsWithTimestamp[0].timestamp).format('DD.MM.YYYY, HH:mm')}\``);
        embed.addField('First played (since 29.05.2020)', `:calendar_spiral: \`${moment(playsWithTimestamp[playsWithTimestamp.length - 1].timestamp).format('DD.MM.YYYY, HH:mm')}\``);

        this._sendEmbedMessage(msg, embed);
    }

    private _sendMessage(msg: Message, text: string) {
        if (msg.channel.id === this._botClient.getConfig().wallEChannelID) {
            msg.channel.send(text);
        } else {
            msg.delete();
            this._logger.logText(text);
        }
    }

    private _sendEmbedMessage(msg: Message, embed: MessageEmbed) {
        if (msg.channel.id === this._botClient.getConfig().wallEChannelID) {
            msg.channel.send(embed);
        } else {
            msg.delete();
            this._logger.logEmbed(embed);
        }
    }

    private _formatDuration(duration: moment.Duration): string {
        let formattedDuration = '';
        formattedDuration += duration.hours() > 0 ? `${duration.hours()}:` : '';
        formattedDuration += duration.hours() > 0 && duration.minutes() < 10 ? `0${duration.minutes()}:` : `${duration.minutes()}:`;
        formattedDuration += duration.seconds() > 9 ? duration.seconds() : `0${duration.seconds()}`;

        return formattedDuration;
    }

}