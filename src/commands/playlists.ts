import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client, MessageEmbed } from 'discord.js';
import { Logger } from '../logger';
import config from '../config';
import moment from 'moment';

export default class playlistsCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 9,
        name: 'playlists',
        category: 'Playlist',
        description: 'Lists all created playlists or shows the songs of a specific playlist.',
        argsRequired: false,
        admin: false,
        aliases: ['playlist'],
        usage: 'playlists [playlistname | id]',
        examples: ['playlists [playlistname | id]']
    }

    private _botClient: BotClient;

    private _client: Client;

    private _logger: Logger;

    public initCommand(botClient: BotClient) {
        this._botClient = botClient;
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        let embed: MessageEmbed = new MessageEmbed();
        embed.setColor(0xEDD5BD);
        embed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        embed.setFooter('Pridefully serving the BDC-Server.');

        const playlists = await this._botClient.getDBConnection().getPlaylistsRepository().find({ relations: ['songs'] });

        if (args[0]) {
            const playlist = playlists.find(val => val.name === args[0]);
            if (!playlist) {
                this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, the playlist ${args[0]} does not exist.`)
                return;
            }
            const songCount = playlist.songs.length;
            const duration = moment.duration(playlist.songs.map((value) => value.length).reduce((a, b) => a + b, 0), 'seconds');
            const durationString = this._formatDuration(duration);
            embed.setTitle(`Playlist **${playlist.name}**\n**${songCount}** Songs. Total length: **${durationString}**`);
            let songField = '';
            for (const song of playlist.songs) {
                songField += `${song.playlistIndex}. ${song.name}\n▬▬ https://youtu.be/${song.id}\n`;
            }
            if (songField) {
                embed.addField('Songs', songField);
            } else {
                embed.addField('Songs', 'No songs in this playlist.');
            }
            this._sendEmbedMessage(msg, embed);
        } else {
            for (const playlist of playlists) {
                const songCount = playlist.songs.length;
                const duration = moment.duration(playlist.songs.map((value) => value.length).reduce((a, b) => a + b, 0), 'seconds');
                const durationString = this._formatDuration(duration);
                embed.addField(`${playlist.id} - ${playlist.name}`, `**${songCount}** Songs. Total length: **${durationString}**`);
            }
            embed.setTitle(playlists.length === 0 ? 'No playlists found' : 'Playlists');
            this._sendEmbedMessage(msg, embed);
        }
    }

    private _formatDuration(duration: moment.Duration): string {
        let formattedDuration = '';
        formattedDuration += duration.hours() > 0 ? `${duration.hours()}:` : '';
        formattedDuration += duration.hours() > 0 && duration.minutes() < 10 ? `0${duration.minutes()}:` : `${duration.minutes()}:`;
        formattedDuration += duration.seconds() > 9 ? duration.seconds() : `0${duration.seconds()}`;

        return formattedDuration;
    }

    private _sendMessage(msg: Message, text: string) {
        if (msg.channel.id === config.wallEChannelID) {
            msg.channel.send(text);
        } else {
            msg.delete();
            this._logger.logText(text);
        }
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