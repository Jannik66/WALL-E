import { Message, Client, MessageEmbed, version, VoiceChannel } from 'discord.js';
import moment from 'moment';
import fs from 'fs';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import { Repository, Connection } from 'typeorm';
import { Playlist } from '../entities/playlist';
import { UserSong } from '../entities/userSong';
import { Song } from '../entities/song';
import { VoiceStat } from '../entities/voiceStat';

export default class statsCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 16,
        name: 'stats',
        category: 'Information',
        description: 'Some noice stats.\n\nParameters:\n`b` - Bot stats\n`v [Month]` - Voice stats\n`m [Month]` - Music stats',
        argsRequired: true,
        admin: false,
        aliases: [],
        usage: 'stats',
        examples: ['stats']
    }

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

    private _logger: Logger;

    private _client: Client;

    private _connection: Connection;
    private _userSongRepository: Repository<UserSong>;
    private _playlistRepository: Repository<Playlist>;
    private _voiceStatRepository: Repository<VoiceStat>;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
        this._connection = this._botClient.getDatabase().getConnection();
        this._userSongRepository = this._botClient.getDatabase().getUserSongRepository();
        this._playlistRepository = this._botClient.getDatabase().getPlaylistRepository();
        this._voiceStatRepository = this._botClient.getDatabase().getVoiceStatRepository();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        switch (args[0]) {
            case 'b':
            case 'bot':
                this._sendBotStats(msg, args);
                break;
            case 'v':
            case 'voice':
                this._sendVoiceStats(msg, args);
                break;
            case 'm':
            case 'music':
                this._sendMusicStats(msg, args);
                break;
            default:
                this._sendErrorMessage(msg, 'Unknown argument.');
                break;
        }
    };

    private async _sendBotStats(msg: Message, args: string[]) {
        const statEmbed = new MessageEmbed();
        statEmbed.setColor(0xEDD5BD);
        statEmbed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        statEmbed.setFooter('Pridefully serving the BDC-Server.');
        statEmbed.setTitle(`:part_alternation_mark: Bot Stats`);

        statEmbed.addField(`:stopwatch: Uptime`, `${this._formatTime(process.uptime())}`, true);
        statEmbed.addField(`:minidisc: Used memory`, `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} mb`, true);

        const databaseStats = fs.statSync('./database/WALLE.db');
        const fileSize = databaseStats.size / 1000;
        statEmbed.addField(':card_box: Database Size', `${fileSize.toFixed(1)} kb`, true);

        statEmbed.addField(`<:djs:669263957847965729> Discord.js Version`, `v${version}`, true);
        statEmbed.addField(`<:nodejs:669263936998342716> Node.js Version`, `${process.version}`, true);
        statEmbed.addField('\u200B', '\u200B', true);

        this._sendEmbedMessage(msg, statEmbed);
    }

    private async _sendMusicStats(msg: Message, args: string[]) {
        let songsPlayedCount: number;
        let songsPlayLength: number;
        let topSongsString: string;
        let month: string;
        const playlists = await this._playlistRepository.find({ relations: ['songs'] });
        const playlistSongCount = playlists.map(playlist => playlist.songs).map(songs => songs.length).reduce((a, b) => a + b);
        const songs = await this._connection.getRepository(Song).find();
        const songCount = songs.length;

        const statEmbed = new MessageEmbed();
        statEmbed.setColor(0xEDD5BD);
        statEmbed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        statEmbed.setFooter('Pridefully serving the BDC-Server.');

        if (args[1]) {
            const date = moment(args[1], args[1].match(/^[0-9]*$/) ? 'MM' : 'MMMM');
            if (!date.isValid()) {
                this._sendErrorMessage(msg, `Could not parse \`${args[1]}\` to a month.`);
                return;
            }
            if (args[2]) {
                if (!args[2].match(/^[0-9]*$/) && args[2].length === 4) {
                    this._sendErrorMessage(msg, `Could not parse \`${args[2]}\` to a year.`);
                    return;
                }
                date.year(parseInt(args[2]));
            }

            const monthBeginDate = moment(date).startOf('month').utcOffset(0);
            const monthEndDate = moment(date).endOf('month').utcOffset(0);

            let topSongsMonth: { id: string, name: string, totalPlayed: number }[] = await this._userSongRepository
                .createQueryBuilder('userSong')
                .leftJoin('userSong.song', 'song')
                .groupBy('userSong.song')
                .select('song.id', 'id')
                .addSelect('song.name', 'name')
                .addSelect('count(*)', 'totalPlayed')
                .where("userSong.timestamp BETWEEN :beginOfMonth AND :endOfMonth",
                    { beginOfMonth: monthBeginDate.toISOString(), endOfMonth: monthEndDate.toISOString() })
                .orderBy('count(*)', 'DESC')
                .limit(5)
                .getRawMany();

            statEmbed.setTitle(`:part_alternation_mark: Music Stats of Month ${monthEndDate.format('MMMM YYYY')}`);
            month = monthEndDate.format('MMMM');

            if (topSongsMonth.length === 0) {
                statEmbed.setDescription('No entries found for this month');
                this._sendEmbedMessage(msg, statEmbed);
                return;
            }

            topSongsString = this._formatTopSongs(topSongsMonth);

            const userSongs = await this._userSongRepository
                .createQueryBuilder('userSong')
                .leftJoin('userSong.song', 'song')
                .select('song.length', 'length')
                .where("userSong.timestamp BETWEEN :beginOfMonth AND :endOfMonth",
                    { beginOfMonth: monthBeginDate.toISOString(), endOfMonth: monthEndDate.toISOString() })
                .getRawMany();

            songsPlayedCount = userSongs.length;
            songsPlayLength = userSongs.map(userSong => userSong.length).reduce((a, b) => a + b);

        } else {
            let topSongsAllTime: { id: string, name: string, totalPlayed: number }[] = await this._userSongRepository
                .createQueryBuilder('userSong')
                .leftJoin('userSong.song', 'song')
                .groupBy('userSong.song')
                .select('song.id', 'id')
                .addSelect('song.name', 'name')
                .addSelect('count(*)', 'totalPlayed')
                .orderBy('count(*)', 'DESC')
                .limit(5)
                .getRawMany();

            statEmbed.setTitle(`:part_alternation_mark: Music Stats`);

            if (topSongsAllTime.length === 0) {
                statEmbed.setDescription('No entries found');
                this._sendEmbedMessage(msg, statEmbed);
                return;
            }

            topSongsString = this._formatTopSongs(topSongsAllTime);

            const userSongsWithCount = await this._userSongRepository
                .createQueryBuilder('userSong')
                .leftJoin('userSong.song', 'song')
                .select('song.length', 'length')
                .getRawMany();

            songsPlayedCount = userSongsWithCount.length;
            songsPlayLength = userSongsWithCount.map(userSongs => userSongs.length).reduce((a, b) => a + b);

        }

        statEmbed.addField(`:dividers: Songs in database`, `${songCount}`, true);
        statEmbed.addField(`:cd: Songs played${month ? ` (In ${month})` : ''}`, `${songsPlayedCount}\n${this._formatTime(songsPlayLength)}`, true);
        statEmbed.addField('\u200B', '\u200B', true);

        statEmbed.addField(`:notepad_spiral: Total Playlists`, `${playlists.length}`, true);
        statEmbed.addField(`:dvd: Total Songs in Playlists`, `${playlistSongCount}`, true);
        statEmbed.addField('\u200B', '\u200B', true);

        statEmbed.addField('\u200B', '\u200B');

        statEmbed.addField(`:trophy: Most played songs`, topSongsString);

        this._sendEmbedMessage(msg, statEmbed);
    }

    private async _sendVoiceStats(msg: Message, args: string[]) {
        const statEmbed = new MessageEmbed();
        statEmbed.setColor(0xEDD5BD);
        statEmbed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        statEmbed.setFooter('Pridefully serving the BDC-Server.');

        let voiceStats: { userId: string, channelId: string }[];

        if (args[1]) {
            const date = moment(args[1], args[1].match(/^[0-9]*$/) ? 'MM' : 'MMMM');
            if (!date.isValid()) {
                this._sendErrorMessage(msg, `Could not parse \`${args[1]}\` to a month.`);
                return;
            }
            if (args[2]) {
                if (!args[2].match(/^[0-9]*$/) && args[2].length === 4) {
                    this._sendErrorMessage(msg, `Could not parse \`${args[2]}\` to a year.`);
                    return;
                }
                date.year(parseInt(args[2]));
            }

            const monthBeginDate = moment(date).startOf('month').utcOffset(0);
            const monthEndDate = moment(date).endOf('month').utcOffset(0);

            voiceStats = await this._voiceStatRepository.createQueryBuilder('voiceStat')
                .select('voiceStat.userID', 'userId')
                .addSelect('voiceStat.channelID', 'channelId')
                .where("voiceStat.timestamp BETWEEN :beginOfMonth AND :endOfMonth",
                    { beginOfMonth: monthBeginDate.toISOString(), endOfMonth: monthEndDate.toISOString() })
                .getRawMany();

            statEmbed.setTitle(`:part_alternation_mark: Voice Stats of Month ${monthEndDate.format('MMMM YYYY')}`);

            if (voiceStats.length === 0) {
                statEmbed.setDescription('No entries found for this month');
                this._sendEmbedMessage(msg, statEmbed);
                return;
            }

        } else {
            voiceStats = await this._voiceStatRepository.createQueryBuilder('voiceStat')
                .select('voiceStat.userID', 'userId')
                .addSelect('voiceStat.channelID', 'channelId')
                .getRawMany();

            statEmbed.setTitle(`:part_alternation_mark: Voice Stats`);

            if (voiceStats.length === 0) {
                statEmbed.setDescription('No entries found for this month');
                this._sendEmbedMessage(msg, statEmbed);
                return;
            }
        }

        statEmbed.addField(`:loud_sound: Total time in voice`, this._formatVoiceMinutes(voiceStats.length));

        const groupedByUser: { userId: string, min: number }[] = [];
        voiceStats.forEach(vs => {
            const i = groupedByUser.findIndex(grouped => grouped.userId === vs.userId);
            if (i >= 0) {
                groupedByUser[i].min++;
            } else {
                groupedByUser.push({ userId: vs.userId, min: 1 });
            }
        });
        groupedByUser.sort((a, b) => {
            if (a.min < b.min) return 1;
            if (a.min > b.min) return -1;
            return 0;
        });
        const voiceMembersString = this._formatVoiceMembers(groupedByUser);
        statEmbed.addField(`:speaking_head: Time in voice by users`, voiceMembersString, true);

        const groupedByChannel: { channelId: string, min: number }[] = [];
        voiceStats.forEach(vs => {
            const i = groupedByChannel.findIndex(grouped => grouped.channelId === vs.channelId);
            if (i >= 0) {
                groupedByChannel[i].min++;
            } else {
                groupedByChannel.push({ channelId: vs.channelId, min: 1 });
            }
        });
        groupedByChannel.sort((a, b) => {
            if (a.min < b.min) return 1;
            if (a.min > b.min) return -1;
            return 0;
        });
        const voiceChannelsString = this._formatVoiceChannels(groupedByChannel);
        statEmbed.addField(`:hash: Time in voice by channels`, voiceChannelsString, true);


        this._sendEmbedMessage(msg, statEmbed);
    }

    private _formatTime(seconds: number) {
        let uptime = moment.duration(seconds, 'seconds');
        return (Math.floor(uptime.asMonths()) > 0 ? `${Math.floor(uptime.asMonths())}M ` : '') +
            (Math.floor(uptime.asMonths()) > 0 || uptime.days() > 0 ? `${uptime.days()}d ` : '') +
            (uptime.hours() > 0 || uptime.days() > 0 || Math.floor(uptime.asMonths()) > 0 ? `${uptime.hours()}h ` : '') +
            (uptime.minutes() > 0 || uptime.hours() > 0 || uptime.days() > 0 || Math.floor(uptime.asMonths()) > 0 ? `${uptime.minutes()}m ` : '') +
            (uptime.seconds() >= 10 ? `${uptime.seconds()}s` : `${uptime.seconds()}s`);
    };

    private _formatTopSongs(topSongs: { id: string, name: string, totalPlayed: number }[]): string {
        let topSongsString = '';
        if (topSongs.length === 0) {
            topSongsString = 'None...';
        } else {
            for (const i in topSongs) {
                topSongsString += `\n${this._numbers[i]} ${topSongs[i].name}`;
                topSongsString += `\n:arrows_counterclockwise: \`${topSongs[i].totalPlayed}\` :link: [Youtube](https://youtu.be/${topSongs[i].id})`;
            }
        }
        return topSongsString;
    }

    private _formatVoiceMembers(voiceMembers: { userId: string, min: number }[]): string {
        let voiceMembersString = '';
        if (voiceMembers.length === 0) {
            voiceMembersString = 'None...';
        } else {
            for (const i in voiceMembers) {
                voiceMembersString += `\n${this._numbers[i]} <@${voiceMembers[i].userId}>`;
                voiceMembersString += `\n:stopwatch: \`${this._formatVoiceMinutes(voiceMembers[i].min)}\``;
            }
        }
        return voiceMembersString;
    }

    private _formatVoiceChannels(voiceMembers: { channelId: string, min: number }[]): string {
        let voiceMembersString = '';
        if (voiceMembers.length === 0) {
            voiceMembersString = 'None...';
        } else {
            for (const i in voiceMembers) {
                const vc = this._client.channels.cache.get(voiceMembers[i].channelId) as VoiceChannel;
                voiceMembersString += `\n${this._numbers[i]} ${vc.name}`;
                voiceMembersString += `\n:stopwatch: \`${this._formatVoiceMinutes(voiceMembers[i].min)}\``;
            }
        }
        return voiceMembersString;
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

    private _sendEmbedMessage(msg: Message, embed: MessageEmbed) {
        if (msg.channel.id === this._botClient.getConfig().wallEChannelID) {
            msg.channel.send(embed);
        } else {
            msg.delete();
            this._logger.logEmbed(embed);
        }
    }

    private _sendErrorMessage(msg: Message, text: string) {
        if (msg.channel.id === this._botClient.getConfig().wallEChannelID) {
            msg.channel.send(text);
        } else {
            msg.delete();
            this._logger.logError(msg.author.id, text);
        }
    }
}