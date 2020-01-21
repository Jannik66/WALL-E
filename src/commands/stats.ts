import { Message, Client, MessageEmbed, version } from 'discord.js';
import moment from 'moment';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import config from '../config';
import { Repository } from 'typeorm';
import { Songs } from '../entities/songs';

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

    private _songsRepository: Repository<Songs>;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
        this._songsRepository = this._botClient.getDBConnection().getSongsRepository();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const songs = await this._songsRepository.find();
        let songsCount = songs.map(song => song.timesPlayed).reduce((a, b) => a + b);

        const statEmbed = new MessageEmbed();
        statEmbed.setColor(0xEDD5BD);
        statEmbed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        statEmbed.setFooter('Pridefully serving the BDC-Server.');
        statEmbed.setTitle(`:part_alternation_mark: Stats`);

        statEmbed.addField(`:stopwatch: Uptime`, `${this.formatUptime(process.uptime())}`, true);
        statEmbed.addField(`:dvd: Total Songs played`, `${songsCount}`, true);
        // add: total playlists
        // add: total songs in playlists
        // sort with empty fields (addBlankField)

        statEmbed.addField(`<:djs:669263957847965729>Discord.js Version`, `v${version}`, true);
        statEmbed.addField(`<:nodejs:669263936998342716>Node.js Version`, `${process.version}`, true)
        statEmbed.addField(`:minidisc: Used memory`, `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} mb`, true);

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