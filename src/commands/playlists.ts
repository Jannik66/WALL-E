import { Message, Client, MessageEmbed } from 'discord.js';
import moment from 'moment';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import { Playlist } from '../entities/playlist';

export default class playlistsCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 9,
        name: 'playlists',
        category: 'Playlist',
        description: 'Lists all created playlists.',
        argsRequired: false,
        admin: false,
        aliases: ['pls'],
        usage: 'playlists [playlistname | id]',
        examples: ['playlists']
    }

    private _client: Client;

    private _logger: Logger;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        let embed: MessageEmbed = new MessageEmbed();
        embed.setColor(0xEDD5BD);
        embed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        embed.setFooter('Pridefully serving the BDC-Server.');

        const playlists = await this._botClient.getDatabase().getConnection().getRepository(Playlist).find({ relations: ['songs'] });
        for (const playlist of playlists) {
            const songCount = playlist.songs.length;
            const duration = moment.duration(playlist.songs.map((value) => value.length).reduce((a, b) => a + b, 0), 'seconds');
            const durationString = this._formatDuration(duration);
            embed.addField(`${playlist.id} - ${playlist.name}${playlist.inRandom ? ' | :game_die:' : ''}`, `**${songCount}** Songs. Total length: **${durationString}**`);
        }
        embed.setTitle(playlists.length === 0 ? 'No playlists found' : 'Playlists');
        this._sendEmbedMessage(msg, embed);
    }

    private _formatDuration(duration: moment.Duration): string {
        let formattedDuration = '';
        formattedDuration += duration.hours() > 0 ? `${duration.hours()}:` : '';
        formattedDuration += duration.hours() > 0 && duration.minutes() < 10 ? `0${duration.minutes()}:` : `${duration.minutes()}:`;
        formattedDuration += duration.seconds() > 9 ? duration.seconds() : `0${duration.seconds()}`;

        return formattedDuration;
    }

    private _sendEmbedMessage(msg: Message, embed: MessageEmbed) {
        if (msg.channel.id === this._botClient.getConfig().wallEChannelID) {
            msg.channel.send(embed);
        } else {
            msg.delete();
            this._logger.logEmbed(embed);
        }
    }
}