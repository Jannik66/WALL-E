import { Message } from 'discord.js';

import { BotCommand, BotClient } from '../customInterfaces';
import { AudioPlayer } from '../audio/audioPlayer';
import { Logger } from '../messages/logger';

export default class playCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 14,
        name: 'loop',
        category: 'Music',
        description: 'Loop the current song or the entire queue (`loop all`). (Call command again to disable loop.)',
        argsRequired: false,
        admin: false,
        aliases: ['l'],
        usage: 'loop',
        examples: ['loop', 'loop all']
    }

    private _audioPlayer: AudioPlayer;

    private _logger: Logger;

    constructor(private _botClient: BotClient) {
        this._audioPlayer = this._botClient.getAudioPlayer();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        if (!args[0]) {
            this._audioPlayer.loop(msg, false);
        } else if (args[0].toLowerCase() === 'all') {
            this._audioPlayer.loop(msg, true);
        } else {
            this._logger.logError(msg, ':no_entry_sign: Unknown argument.\nPlease use `loop` to loop one song and `loop all` to loop the entire queue.');
        }
        msg.delete();
    }
}