import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { AudioPlayer } from '../audioPlayer';

export default class skipCommand implements BotCommand {
    information: BotCommand['information'] = {
        id: 2,
        name: 'skip',
        category: 'Music',
        description: 'Skips one song.',
        argsRequired: false,
        hasAfterInit: true,
        admin: false,
        aliases: ['s'],
        usage: 'skip',
        examples: ['skip']
    }

    BotClient: BotClient;

    client: Client;

    audioPlayer: AudioPlayer;

    public initCommand(bot: BotClient) {
        this.BotClient = bot;
        this.client = this.BotClient.getClient();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        this.audioPlayer.skip(msg);
        msg.delete();
    }

    public afterInit() {
        this.audioPlayer = this.BotClient.getAudioPlayer();
    }

}