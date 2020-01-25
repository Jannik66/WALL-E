import { Message, Client, MessageEmbed, version } from 'discord.js';
import moment from 'moment';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import config from '../config';
import { Repository } from 'typeorm';
import { Playlist } from '../entities/playlist';
import { UserSong } from '../entities/userSong';

export default class statsCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 16,
        name: 'stats',
        category: 'Information',
        description: 'Some noice stats.',
        argsRequired: false,
        admin: false,
        aliases: [],
        usage: 'stats',
        examples: ['stats']
    }

    private _logger: Logger;

    private _client: Client;

    private _userSongRepository: Repository<UserSong>;
    private _playlistRepository: Repository<Playlist>;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
        this._userSongRepository = this._botClient.getDatabase().getUserSongRepository();
        this._playlistRepository = this._botClient.getDatabase().getPlaylistRepository();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const userSongs = await this._userSongRepository.find();
        let songsCount = userSongs.map(userSongs => userSongs.timesPlayed).reduce((a, b) => a + b);
        let playlists = await this._playlistRepository.find({ relations: ['songs'] });
        const playlistSongCount = playlists.map(playlist => playlist.songs).map(songs => songs.length).reduce((a, b) => a + b);

        const statEmbed = new MessageEmbed();
        statEmbed.setColor(0xEDD5BD);
        statEmbed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        statEmbed.setFooter('Pridefully serving the BDC-Server.');
        statEmbed.setTitle(`:part_alternation_mark: Stats`);

        statEmbed.addField(`:stopwatch: Uptime`, `${this.formatUptime(process.uptime())}`, true);

        statEmbed.addField(`<:djs:669263957847965729>Discord.js Version`, `v${version}`, true);
        statEmbed.addField(`<:nodejs:669263936998342716>Node.js Version`, `${process.version}`, true);
        statEmbed.addField(`:minidisc: Used memory`, `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} mb`, true);

        statEmbed.addBlankField();
        statEmbed.addField(`:cd: Total Songs played`, `${songsCount}`, true);
        statEmbed.addField(`:notepad_spiral: Total Playlists`, `${playlists.length}`, true);
        statEmbed.addField(`:dvd: Total Songs in Playlists`, `${playlistSongCount}`, true);

        this._sendEmbedMessage(msg, statEmbed);
    }

    formatUptime(seconds: number) {
        let uptime = moment.duration(seconds, 'seconds');
        return (Math.floor(uptime.asMonths()) > 0 ? `${Math.floor(uptime.asMonths())}M ` : '') +
            (Math.floor(uptime.asMonths()) > 0 || uptime.days() > 0 ? `${uptime.days()}d ` : '') +
            (uptime.hours() > 0 || uptime.days() > 0 || Math.floor(uptime.asMonths()) > 0 ? `${uptime.hours()}h ` : '') +
            (uptime.minutes() > 0 || uptime.hours() > 0 || uptime.days() > 0 || Math.floor(uptime.asMonths()) > 0 ? `${uptime.minutes()}m ` : '') +
            (uptime.seconds() >= 10 ? `${uptime.seconds()}s ` : `${uptime.seconds()}s`);
    };

    private _sendEmbedMessage(msg: Message, embed: MessageEmbed) {
        if (msg.channel.id === config.wallEChannelID) {
            msg.channel.send(embed);
        } else {
            msg.delete();
            this._logger.logEmbed(embed);
        }
    }
}