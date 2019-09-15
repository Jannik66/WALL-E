import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { AudioPlayer } from '../audioPlayer';
import { Logger } from '../logger';

export default class skipCommand implements BotCommand {
    information: BotCommand['information'] = {
        id: 4,
        name: 'earrape',
        category: 'Danger',
        description: 'Enable/disable earrape.',
        argsRequired: false,
        hasAfterInit: true,
        admin: false,
        aliases: ['er'],
        usage: 'earrape',
        examples: ['earrape']
    }

    BotClient: BotClient;

    client: Client;

    audioPlayer: AudioPlayer;

    public initCommand(bot: BotClient) {
        this.BotClient = bot;
        this.client = this.BotClient.getClient();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        this.audioPlayer.earrape(msg);
        msg.delete();
    }

    public afterInit() {
        this.audioPlayer = this.BotClient.getAudioPlayer();
    }

}