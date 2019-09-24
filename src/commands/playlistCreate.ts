import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { Logger } from '../logger';
import { MusicQueue } from '../audio/musicQueue';

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

    private _botClient: BotClient;

    private _client: Client;

    private _logger: Logger;

    public initCommand(botClient: BotClient) {
        this._botClient = botClient;
        this._client = this._botClient.getClient();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const playlistName = args[0];

        const playlist = await this._botClient.getDBConnection().getPlaylistsRepository().findOne({ where: { name: playlistName } });

        if (playlist) {
            this._logger.logError(msg, `:no_entry_sign: The playlist "${playlistName}" does already exist.`);
        } else {
            await this._botClient.getDBConnection().getPlaylistsRepository().insert({ name: playlistName });
            this._logger.logSuccess(msg, `Playlist "${playlistName}" successfully created.`);
        }
        msg.delete();
    }

}