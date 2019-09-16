import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { AudioPlayer } from '../audioPlayer';
import { Logger } from '../logger';

export default class leaveCommand implements BotCommand {
    information: BotCommand['information'] = {
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

    BotClient: BotClient;

    client: Client;

    audioPlayer: AudioPlayer;

    logger: Logger;

    public initCommand(bot: BotClient) {
        this.BotClient = bot;
        this.client = this.BotClient.getClient();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        if (!msg.guild.member(this.client.user).voice.channel) {
            this.logger.logError(msg, ':no_entry_sign: I\'m not in a voice channel.');
        } else {
            this.audioPlayer.leave(msg);
        }
        msg.delete();
    }

    public afterInit() {
        this.audioPlayer = this.BotClient.getAudioPlayer();
        this.logger = this.BotClient.getLogger();
    }

}