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
        if (this.dispatcher && this.queue.length > 0) {
            this.dispatcher.end();
            this.logger.logSkip(msg);
        } else {
            // TODO: Log Skip error.
        }
    }

    public leave(msg: Message) {
        if (this.dispatcher && this.queue.length > 0) {
            this.queue = [];
            this.connection.disconnect();
            this.logger.logLeave(msg);
        } else {
            // TODO: Log Skip error.
        }
    }

    public earrape(msg: Message) {
        if (this.dispatcher) {
            if (this.dispatcher.volume === 0.2) {
                this.dispatcher.setVolume(10000);
                this.logger.logEarrape(msg, 1);
            } else {
                this.dispatcher.setVolume(0.2);
                this.logger.logEarrape(msg, 0);
            }
        } else {
            // TODO: Log Earrape error.
        }
    }

    private async initConnection(msg: Message) {
        if (msg.member.voice) {
            if (!this.connection) {
                this.connection = await msg.member.voice.channel.join();
                this.listenToConnectionEvents();
            }
            this.play(this.connection);
        } else {
            msg.channel.send('Join a voice channel');
        }
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