import { Message, Client, MessageEmbed, MessageReaction, User, CollectorFilter } from 'discord.js';
import moment from 'moment';

import config from '../config';
import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import { Playlist } from '../entities/playlist';

export default class playlistCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 17,
        name: 'playlist',
        category: 'Playlist',
        description: 'Manage a playlist.',
        argsRequired: true,
        admin: false,
        aliases: ['pl'],
        usage: 'playlist {playlistname | id}',
        examples: ['playlist 1']
    }

    private _client: Client;

    private _logger: Logger;

    private songsPerSite = 8;

    private _reactionMsgOptions = {
        limit: 5 * 60 * 1000,
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

        const playlists = await this._botClient.getDatabase().getPlaylistRepository().find({ relations: ['songs'] });
        let playlist: Playlist;
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
        this._initMenuReactionMessage(msg, playlist, embed);
    }

    private async _initMenuReactionMessage(msg: Message, playlist: Playlist, embed: MessageEmbed) {
        embed.setTitle(playlist.name);
        embed.addField(`Number of songs`, `${playlist.songs.length}`);

        embed.addField(`Gets noticed in random command`, `${playlist.inRandom ? 'Hell yeah' : 'Um noo...'}`);

        embed.addField('\u200B', '\u200B');
        embed.addField('Menu', `📀: List songs\n✏️: Rename playlist\n🎲: ${playlist.inRandom ? 'Exlude from random command' : 'Include from random command'}\n❌: Delete message`);

        const m = await msg.channel.send(embed);

        const filter = (reaction: MessageReaction, user: User) => {
            return ['📀', '✏️', '🎲', '❌'].includes(reaction.emoji.name) && user.id == msg.author.id;
        };

        this._awaitMenuReactions(msg.author.id, m, filter, playlist);

        await m.react('📀');
        await m.react('✏️');
        await m.react('🎲');
        await m.react('❌');
    }

    private async _awaitMenuReactions(authorID: string, m: Message, filter: CollectorFilter, playlist: Playlist) {
        m.awaitReactions(filter, { max: 1, time: this._reactionMsgOptions.limit, errors: ['time'] })
            .then(async (collected) => {
                const reaction = collected.first();
                if (reaction.emoji.name === '📀') {
                    // remove all reactions
                    await m.reactions.removeAll();
                    this._showSongs(m, playlist, authorID);
                } else if (reaction.emoji.name === '✏️') {
                    // remove all reactions
                    await m.reactions.removeAll();
                    this._renamePlaylist(m, playlist, authorID);
                } else if (reaction.emoji.name === '🎲') {
                    // remove all reactions
                    await m.reactions.removeAll();
                    this._changeRandomSetting(m, playlist, authorID);
                } else if (reaction.emoji.name === '❌') {
                    // trash the message instantly, returning so the listener fully stops
                    return await m.delete();
                } else {
                    this._awaitMenuReactions(authorID, m, filter, playlist);
                }
            }).catch(() => {
                m.reactions.removeAll();
            });
    }

    // =============================================================================
    // 📀
    // Show Songs
    // =============================================================================

    private _showSongs(msg: Message, playlist: Playlist, authorID: string) {
        let embed: MessageEmbed = new MessageEmbed();
        embed.setColor(0xEDD5BD);
        embed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        embed.setFooter('Pridefully serving the BDC-Server.');

        const songCount = playlist.songs.length;
        const duration = moment.duration(playlist.songs.map((value) => value.length).reduce((a, b) => a + b, 0), 'seconds');
        const durationString = this._formatDuration(duration);
        embed.setTitle(`Playlist **${playlist.name}**\n**${songCount}** Songs. Total length: **${durationString}**`);
        playlist.songs = playlist.songs.sort((a, b) => {
            if (a.name.toLowerCase() < b.name.toLowerCase()) { return -1 };
            if (a.name.toLowerCase() > b.name.toLowerCase()) { return 1 };
            return 0;
        });
        if (playlist.songs.length === 0) {
            embed.addField('Songs', 'No songs in this playlist.');
            msg.edit(embed);
            return;
        }
        if (playlist.songs.length > this.songsPerSite) {
            this._initSongReactionMessage(msg, playlist, embed, authorID);
        } else {
            let songField = '';
            for (let i = 0; i < playlist.songs.length; i++) {
                songField += `${i + 1}. ${playlist.songs[i].name}\n▬▬ https://youtu.be/${playlist.songs[i].songId}\n`;
            }
            if (songField) {
                embed.addField('Songs', songField);
            }
            msg.edit(embed);
        }
    }

    private async _initSongReactionMessage(msg: Message, playlist: Playlist, preparedEmbed: MessageEmbed, authorID: string) {
        let pages: MessageEmbed[] = [];
        this._reactionMsgOptions.page = 1;
        this._reactionMsgOptions.max = Math.ceil(playlist.songs.length / this.songsPerSite);

        for (let i = 1; i <= this._reactionMsgOptions.max; i++) {
            pages[i] = new MessageEmbed(preparedEmbed);
            pages[i].setDescription(`:page_facing_up: ${i}/${this._reactionMsgOptions.max}`);
        }

        let songField: string;
        for (let i = 1; i <= this._reactionMsgOptions.max; i++) {
            songField = '';
            let soungCount = i === this._reactionMsgOptions.max && playlist.songs.length % this.songsPerSite !== 0 ? playlist.songs.length % this.songsPerSite : this.songsPerSite;
            for (let a = 0; a < soungCount; a++) {
                songField += `${(i - 1) * this.songsPerSite + a + 1}. ${playlist.songs[(i - 1) * this.songsPerSite + a].name}\n▬▬ https://youtu.be/${playlist.songs[(i - 1) * this.songsPerSite + a].songId}\n`;
            }
            pages[i].addField('Songs', songField);
        }

        const m = await msg.edit({ embed: pages[this._reactionMsgOptions.page] });

        await m.react('⬅');
        await m.react('❌');
        await m.react('➡');

        const filter = (reaction: MessageReaction, user: User) => {
            return ['⬅', '❌', '➡'].includes(reaction.emoji.name) && user.id == authorID;
        };

        this._awaitSongsReactions(authorID, m, filter, pages);
    }

    private async _awaitSongsReactions(authorID: string, m: Message, filter: CollectorFilter, pages: MessageEmbed[]) {
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
                    this._awaitSongsReactions(authorID, m, filter, pages);
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
                    this._awaitSongsReactions(authorID, m, filter, pages);
                } else if (reaction.emoji.name === '❌') {
                    // trash the message instantly, returning so the listener fully stops
                    return await m.delete();
                } else {
                    this._awaitSongsReactions(authorID, m, filter, pages);
                }
            }).catch(() => {
                m.reactions.removeAll();
            });
    }

    private async _removeReaction(m: Message, authorID: string, emoji: string) {
        await m.reactions.cache.find(r => r.emoji.name == emoji).users.remove(authorID);
    }

    // =============================================================================
    // ✏️
    // rename playlist
    // =============================================================================

    private async _renamePlaylist(msg: Message, playlist: Playlist, authorID: string) {
        let response: string;
        let responseMsg: Message;
        msg.edit(`:pencil2: Please enter a new name for the playlist **${playlist.name}**:`, { embed: null });
        const awaitFilter = (m: Message) => m.author.id === authorID;
        await msg.channel.awaitMessages(awaitFilter, {
            max: 1, time: 60000, errors: ['time']
        }).then(collectedMessages => {
            response = collectedMessages.first().content;
            responseMsg = collectedMessages.first();
        }).catch(err => {
            response = null;
        });
        if (response) {
            await this._botClient.getDatabase().getPlaylistRepository().update({ id: playlist.id }, { name: response });
            responseMsg.delete();
            msg.edit(`:white_check_mark: Renamed playlist ${playlist.name} to **${response}**.`)
        } else {
            msg.edit(`:x: Cancelled.`);
        }
    }

    // =============================================================================
    // 🎲
    // change random setting
    // =============================================================================

    private async _changeRandomSetting(msg: Message, playlist: Playlist, authorID: string) {
        await this._botClient.getDatabase().getPlaylistRepository().update({ id: playlist.id }, { inRandom: !playlist.inRandom });
        msg.edit(`:white_check_mark: Successfully ${playlist.inRandom ? 'exlcuded' : 'included'} the playlist **${playlist.name}** ${playlist.inRandom ? 'from' : 'in'} the random command.`, { embed: null });
    }

    // =============================================================================
    // Other functions
    // =============================================================================

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
}