import { Message, Client } from 'discord.js';

import { BotCommand, BotClient } from '../customInterfaces';
import { AudioPlayer } from '../audio/audioPlayer';
import { Logger } from '../messages/logger';

export default class leaveCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 3,
        name: 'leave',
        category: 'Music',
        description: 'Leaves the voice channel and clears the queue.',
        argsRequired: false,
        admin: false,
        aliases: ['stop', 'disconnect'],
        usage: 'leave',
        examples: ['leave']
    }

    private _client: Client;

    private _audioPlayer: AudioPlayer;

    private _logger: Logger;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._audioPlayer = this._botClient.getAudioPlayer();
        this._logger = this._botClient.getLogger();
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
}