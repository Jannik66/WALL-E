import { Message, Client, MessageEmbed, MessageReaction, User, CollectorFilter } from 'discord.js';
import moment from 'moment';

import config from '../config';
import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../logger';
import { Playlists } from '../entities/playlists';

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

    private _client: Client;

    private _logger: Logger;

    private _reactionMsgOptions = {
        limit: 30 * 1000,
        min: 1,
        max: 0,
        page: 1
    }

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const playlistIdentifier = args[0];
        let embed: MessageEmbed = new MessageEmbed();
        embed.setColor(0xEDD5BD);
        embed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        embed.setFooter('Pridefully serving the BDC-Server.');

        const playlists = await this._botClient.getDBConnection().getPlaylistsRepository().find({ relations: ['songs'] });

        if (playlistIdentifier) {
            let playlist: Playlists;
            if (playlistIdentifier.match(/^[0-9]*$/)) {
                playlist = playlists.find(val => val.id === parseInt(playlistIdentifier));
                if (!playlist) {
                    this._sendMessage(msg, `:x: ${msg.author.toString()}, playlist with ID ${playlistIdentifier} not found.`);
                    return;
                }
            } else {
                playlist = playlists.find(val => val.name.toLowerCase() === playlistIdentifier.toLowerCase());
                if (!playlist) {
                    this._sendMessage(msg, `:x: ${msg.author.toString()}, playlist with name ${playlistIdentifier} not found.`);
                    return;
                }
            }
            const songCount = playlist.songs.length;
            const duration = moment.duration(playlist.songs.map((value) => value.length).reduce((a, b) => a + b, 0), 'seconds');
            const durationString = this._formatDuration(duration);
            embed.setTitle(`Playlist **${playlist.name}**\n**${songCount}** Songs. Total length: **${durationString}**`);
            playlist.songs = playlist.songs.sort((a, b) => a.playlistIndex - b.playlistIndex);
            if (playlist.songs.length === 0) {
                embed.addField('Songs', 'No songs in this playlist.');
                this._sendEmbedMessage(msg, embed);
                return;
            }
            if (playlist.songs.length > 10) {
                this._initReactionMessage(msg, playlist, embed);
            } else {
                let songField = '';
                for (const song of playlist.songs) {
                    songField += `${song.playlistIndex}. ${song.name}\n▬▬ https://youtu.be/${song.id}\n`;
                }
                if (songField) {
                    embed.addField('Songs', songField);
                }
                this._sendEmbedMessage(msg, embed);
            }
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

    private async _initReactionMessage(msg: Message, playlist: Playlists, preparedEmbed: MessageEmbed) {
        let pages: MessageEmbed[] = [];
        this._reactionMsgOptions.page = 1;
        this._reactionMsgOptions.max = Math.ceil(playlist.songs.length / 10);

        for (let i = 1; i <= this._reactionMsgOptions.max; i++) {
            pages[i] = new MessageEmbed(preparedEmbed);
            pages[i].setDescription(`:page_facing_up: ${i}/${this._reactionMsgOptions.max}`);
        }

        let songField: string;
        for (let i = 1; i <= this._reactionMsgOptions.max; i++) {
            songField = '';
            let soungCount = i === this._reactionMsgOptions.max && playlist.songs.length % 10 !== 0 ? playlist.songs.length % 10 : 10;
            for (let a = 0; a < soungCount; a++) {
                songField += `${playlist.songs[(i - 1) * 10 + a].playlistIndex}. ${playlist.songs[(i - 1) * 10 + a].name}\n▬▬ https://youtu.be/${playlist.songs[(i - 1) * 10 + a].id}\n`;
            }
            pages[i].addField('Songs', songField);
        }

        const m = await msg.channel.send({ embed: pages[this._reactionMsgOptions.page] });

        await m.react('⬅');
        await m.react('❌');
        await m.react('➡');

        const filter = (reaction: MessageReaction, user: User) => {
            return ['⬅', '❌', '➡'].includes(reaction.emoji.name) && user.id == msg.author.id;
        };

        this._awaitReactions(msg.author.id, m, filter, pages);
    }

    private async _removeReaction(m: Message, authorID: string, emoji: string) {
        await m.reactions.find(r => r.emoji.name == emoji).users.remove(authorID);
    }

    private async _awaitReactions(authorID: string, m: Message, filter: CollectorFilter, pages: MessageEmbed[]) {
        m.awaitReactions(filter, { max: 1, time: this._reactionMsgOptions.limit, errors: ['time'] })
            .then(async (collected) => {
                const reaction = collected.first();
                if (reaction.emoji.name === '⬅') {
                    // remove the back reaction if possible
                    await this._removeReaction(m, authorID, '⬅');

                    // check if the page can go back one
                    if (this._reactionMsgOptions.page != this._reactionMsgOptions.min) {
                        // change the page
                        this._reactionMsgOptions.page = this._reactionMsgOptions.page - 1;
                        await m.edit({ embed: pages[this._reactionMsgOptions.page] });
                    }

                    // restart the listener 
                    this._awaitReactions(authorID, m, filter, pages);
                } else if (reaction.emoji.name === '➡') {
                    // remove the back reaction if possible
                    await this._removeReaction(m, authorID, '➡');
                    // check if the page can go forward one
                    if (this._reactionMsgOptions.page != this._reactionMsgOptions.max) {
                        // change the page
                        this._reactionMsgOptions.page = this._reactionMsgOptions.page + 1;
                        await m.edit({ embed: pages[this._reactionMsgOptions.page] });
                    }

                    // restart the listener
                    this._awaitReactions(authorID, m, filter, pages);
                } else if (reaction.emoji.name === '❌') {
                    // trash the message instantly, returning so the listener fully stops
                    return await m.delete();
                } else {
                    this._awaitReactions(authorID, m, filter, pages);
                }
            }).catch(() => {
                m.reactions.removeAll();
            });
    }
}