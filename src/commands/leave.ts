import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { AudioPlayer } from '../audioPlayer';
import { Logger } from '../logger';

export default class leaveCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 3,
        name: 'leave',
        category: 'Music',
        description: 'Leaves the voice channel and resets the queue.',
        argsRequired: false,
        hasAfterInit: true,
        admin: false,
        aliases: ['l'],
        usage: 'leave',
        examples: ['leave']
    }

    private _botClient: BotClient;

    private _client: Client;

    private _audioPlayer: AudioPlayer;

    private _logger: Logger;

    public initCommand(botClient: BotClient) {
        this._botClient = botClient;
        this._client = this._botClient.getClient();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        // check if bot is in a voice channel
        if (!msg.guild.member(this._client.user).voice.channel) {
            this._logger.logError(msg, ':no_entry_sign: I\'m not in a voice channel.');
        } else {
            // leave voice channel and clear queue
            this._audioPlayer.leave(msg);
        }
        msg.delete();
    }

    public afterInit() {
        this._audioPlayer = this._botClient.getAudioPlayer();
        this._logger = this._botClient.getLogger();
    }

}