import { Message } from 'discord.js';

import config from '../config';
import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';

export default class playlistCreateCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 7,
        name: 'playlistcreate',
        category: 'Playlist',
        description: 'Creates a new, empty playlist.',
        argsRequired: true,
        admin: false,
        aliases: ['pc'],
        usage: 'playlistcreate {Name}',
        examples: ['playlistcreate Memes']
    }

    private _logger: Logger;

    constructor(private _botClient: BotClient) {
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const playlistName = args[0];

        if (playlistName.match(/^[0-9]*$/)) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, the playlist can't be a number`);
            return;
        }

        const playlist = await this._botClient.getDBConnection().getPlaylistsRepository().findOne({ where: { name: playlistName } });

        if (playlist) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, the playlist **${playlistName}** does already exist.`);
            return;
        }
        await this._botClient.getDBConnection().getPlaylistsRepository().insert({ name: playlistName });
        this._sendMessage(msg, `:white_check_mark: Playlist **${playlistName}** successfully created.`);
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