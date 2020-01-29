import { Message, Client, MessageEmbed } from 'discord.js';
import Fuse, { FuseResultWithMatches } from 'fuse.js';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import config from '../config';
import { Repository } from 'typeorm';
import { Song } from '../entities/song';

export default class searchCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 18,
        name: 'search',
        category: 'Information',
        description: 'Searches through the song database of WALL-E.',
        argsRequired: true,
        admin: false,
        aliases: ['find'],
        usage: 'search {searchstring}',
        examples: ['search Bad Computer']
    }

    private _client: Client;

    private _logger: Logger;

    private _songRepository: Repository<Song>;

    private _fuseOptions = {
        shouldSort: true,
        includeMatches: true,
        threshold: 0.3,
        location: 0,
        distance: 200,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name']
    };

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
        this._songRepository = this._botClient.getDatabase().getConnection().getRepository(Song);
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const songs = await this._songRepository.find();
        const fuse = new Fuse(songs, this._fuseOptions);
        const searchString = args.join(' ');
        if (searchString.length < 3) {
            this._sendMessage(msg, 'Please search with 3 or more letters.');
            return;
        }
        let result = fuse.search(searchString);
        if (result.length === 0) {
            this._sendMessage(msg, 'Nothing found...');
            return;
        }
        let embed: MessageEmbed = new MessageEmbed();
        embed.setColor(0xEDD5BD);
        embed.setFooter('Pridefully serving the BDC-Server.');
        embed.setTitle(`Result for \`${searchString}\``);
        let songList = '';
        for (let i = 0; i < result.length; i++) {
            const song = (result[i] as FuseResultWithMatches<Song>);
            let formattedName = '';
            for (let a = 0; a < song.item.name.length; a++) {
                if (song.matches[0].indices.find((arr: number[]) => arr[0] === a)) {
                    if (song.matches[0].indices.find((arr: number[]) => arr[0] === arr[1] && arr[1] === a)) {
                        formattedName += `**${song.item.name[a]}**`;
                    } else {
                        formattedName += `**${song.item.name[a]}`;
                    }
                } else if (song.matches[0].indices.find((arr: number[]) => arr[1] === a)) {
                    formattedName += `${song.item.name[a]}**`;
                } else {
                    formattedName += `${song.item.name[a]}`;
                }
            }
            if ((songList + `${i + 1}. ${formattedName}\n▬▬ https://youtu.be/${song.item.id}\n`).length > 1024) {
                break;
            }
            songList += `${i + 1}. ${formattedName}\n▬▬ https://youtu.be/${song.item.id}\n`
        }
        embed.addField('Songs', songList);
        this._sendEmbedMessage(msg, embed);
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