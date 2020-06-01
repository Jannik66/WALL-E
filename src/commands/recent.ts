import { Message, Client, MessageEmbed } from 'discord.js';
import moment from 'moment';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import { Repository } from 'typeorm';
import { UserSong } from '../entities/userSong';
import config from '../config';

export default class recentCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 21,
        name: 'recent',
        category: 'Music',
        description: 'Lists the last played songs.',
        argsRequired: false,
        admin: false,
        aliases: [],
        usage: 'recent',
        examples: ['recent']
    }

    private _logger: Logger;

    private _client: Client;

    private _userSongRepository: Repository<UserSong>;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
        this._userSongRepository = this._botClient.getDatabase().getUserSongRepository();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const embed = new MessageEmbed();
        const recentSongs = await this._userSongRepository.find({ order: { timestamp: "DESC" }, relations: ['song'], take: 5 });

        embed.setColor(0xEDD5BD);
        embed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        embed.setFooter('Pridefully serving the BDC-Server.');
        embed.setTitle(`:hourglass_flowing_sand: Recent played songs`);

        let recentSongsString = '';
        for (const i in recentSongs) {
            recentSongsString += `\n:musical_note: ${recentSongs[i].song.name}`;
            recentSongsString += `\n:calendar_spiral: \`${moment(recentSongs[i].timestamp).format('DD.MM.YYYY, HH:mm')}\``;
            recentSongsString += `\n:link: [Youtube](https://youtu.be/${recentSongs[i].song.id})\n`;
        }

        embed.addField('Songs', recentSongsString);

        this._sendEmbedMessage(msg, embed);
    }

    private _sendEmbedMessage(msg: Message, embed: MessageEmbed) {
        if (msg.channel.id === config.wallEChannelID) {
            msg.channel.send(embed);
        } else {
            msg.delete();
            this._logger.logEmbed(embed);
        }
    }

}