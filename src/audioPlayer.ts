import { BotClient } from './customInterfaces';
import { Client, Message, StreamDispatcher, VoiceConnection } from 'discord.js';
import youtubedl from 'youtube-dl';
import { Readable } from 'stream';
import { StatusMessages } from './statusMessages';
import { Logger } from './logger';

export class AudioPlayer {
    queue: { name: string, requester: string, id: string }[] = [];

    BotClient: BotClient;

    client: Client;

    statusMessage: StatusMessages;

    connection: VoiceConnection;

    dispatcher: StreamDispatcher;

    logger: Logger;

    public init(bot: BotClient) {
        this.BotClient = bot;
        this.client = this.BotClient.getClient();
    }

    public afterInit() {
        this.statusMessage = this.BotClient.getStatusMessages();
        this.logger = this.BotClient.getLogger();
    }

    public addVideo(msg: Message, video: { name: string, requester: string, id: string }) {
        this.queue.push(video);
        if (this.queue.length === 1) {
            this.initConnection(msg);
        } else {
            this.statusMessage.changeSongPlaying(this.queue);
        }
    }

    public skip(msg: Message) {
        if (this.dispatcher) {
            this.dispatcher.end();
            this.logger.logSkip(msg);
        } else {
            this.logger.logError(msg, `:no_entry_sign: I'm not playing anything.`);
        }
    }

    public leave(msg: Message) {
        msg.guild.member(this.client.user).voice.channel.leave();
        this.queue = [];
        this.logger.logLeave(msg);
    }

    public pause(msg: Message) {
        if (this.dispatcher) {
            if (this.dispatcher.paused) {
                this.dispatcher.resume();
                this.logger.logResume(msg);
            } else {
                this.dispatcher.pause();
                this.logger.logPause(msg);
            }
        } else {
            this.logger.logError(msg, `:no_entry_sign: I'm not playing anything.`);
        }

    }

    private async initConnection(msg: Message) {
        if (!this.connection) {
            this.connection = await msg.member.voice.channel.join();
            this.listenToConnectionEvents();
        }
        this.play(this.connection);
    }

    private async play(connection: VoiceConnection) {
        const stream = youtubedl(`https://youtu.be/${this.queue[0].id}`, [], {});

        this.dispatcher = this.connection.play(stream as Readable, {
            bitrate: this.connection.channel.bitrate / 1000,
            volume: 0.2
        });
        this.dispatcher.on('start', () => {
            this.statusMessage.changeSongPlaying(this.queue);
        });
        this.dispatcher.on('end', () => {
            this.queue.shift();
            if (this.queue.length > 0) {
                this.play(connection);
            } else {
                this.statusMessage.removeSongPlaying();
            }
        });
    }

    private listenToConnectionEvents() {
        this.connection.on('disconnect', () => {
            this.queue = [];
            this.connection = null;
            this.statusMessage.removeSongPlaying();
        })
    }
}