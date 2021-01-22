import { Message, Client, MessageEmbed } from 'discord.js';
// @ts-ignore
import ytsr from 'ytsr';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import config from '../config';

export default class searchytCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 22,
        name: 'searchyt',
        category: 'Information',
        description: 'Browse youtube.',
        argsRequired: true,
        admin: false,
        aliases: ['youtube', 'syt', 'yt'],
        usage: 'searchyt {searchstring}',
        examples: ['searchyt Bad Computer']
    }

    private _client: Client;

    private _logger: Logger;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const embed = new MessageEmbed();
        const searchString = args.join(' ');

        embed.setColor(0xEDD5BD);
        embed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        embed.setFooter('Pridefully serving the BDC-Server.');
        embed.setTitle(`Youtube search result for \`${searchString}\``);

        await msg.react('🔎');
        const result = await ytsr(searchString, { limit: 15 });
        const videos = result.items.filter((i: any) => i.type === 'video' && !i.live) as ytsr.Video[];

        let videosString = '';
        for (let i = 0; i < (videos.length < 5 ? videos.length : 5); i++) {
            const videoRegex = videos[i].url.match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
            const videoID = videoRegex[5];
            videosString += `\n:musical_note: ${videos[i].title}`;
            videosString += `\n:hourglass_flowing_sand: ${videos[i].duration}`;
            videosString += `\n:eyes: ${Intl.NumberFormat('de-CH').format(videos[i].views)}`;
            videosString += `\n:link: https://youtu.be/${videoID}\n`;
        }

        embed.addField('Videos', videosString);

        this._sendEmbedMessage(msg, embed);

        msg.reactions.removeAll();
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