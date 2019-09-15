import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client } from 'discord.js';
import { AudioPlayer } from '../audioPlayer';
import youtubedl from 'youtube-dl';
import { Logger } from '../logger';

export default class playCommand implements BotCommand {
    information: BotCommand['information'] = {
        id: 1,
        name: 'play',
        category: 'Music',
        description: 'Play any youtube song.',
        argsRequired: true,
        hasAfterInit: true,
        admin: false,
        aliases: ['p'],
        usage: 'play {youbute link | search query}',
        examples: ['play https://youtu.be/GMb02tAqDRM', 'play Bad Computer - Silhouette']
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
        let videoRegex = args[0].match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/);
        if (videoRegex) {
            let videoID = videoRegex[5];
            if (videoID) {
                msg.react('🔎');
                youtubedl.getInfo(videoID, [], async (err, info: any) => {
                    if (err) {
                        msg.channel.send('Error...');
                        return;
                    }

                    this.audioPlayer.addVideo(msg, { name: info.title, requester: msg.author.id, id: info.id });
                    this.logger.logSong(msg, { name: info.title, id: info.id });
                    msg.delete();
                });
            } else {
                msg.channel.send('No Video ID found in the provided link...');
            }
        } else {
            msg.channel.send('Please provide a youtube link...');
        }
    }

    public afterInit() {
        this.audioPlayer = this.BotClient.getAudioPlayer();
        this.logger = this.BotClient.getLogger();
    }

}