import { BotClient, Song } from './customInterfaces';
import { Client, Message, StreamDispatcher, VoiceConnection } from 'discord.js';
import * as ytdl from 'ytdl-core';
// @ts-ignore
import miniget from 'miniget';
import { StatusMessages } from './statusMessages';
import { Logger } from './logger';
import fs from 'fs';
import { MusicQueue } from './musicQueue';

export class AudioPlayer {

    BotClient: BotClient;

    client: Client;

    statusMessage: StatusMessages;

    connection: VoiceConnection;

    dispatcher: StreamDispatcher;

    logger: Logger;

    musicQueue: MusicQueue;

    public init(bot: BotClient) {
        this.BotClient = bot;
        this.client = this.BotClient.getClient();
    }

    public afterInit() {
        this.statusMessage = this.BotClient.getStatusMessages();
        this.logger = this.BotClient.getLogger();
        this.musicQueue = this.BotClient.getMusicQueue();
    }

    public addVideo(msg: Message, video: { name: string, requester: string, id: string, length: string }) {
        this.musicQueue.addToQueue(video);
        if (this.musicQueue.getQueue().length === 1) {
            this.initConnection(msg);
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
        this.musicQueue.clearQueue();
        this.logger.logLeave(msg);
    }

    public pause(msg: Message) {
        if (this.dispatcher) {
            if (this.dispatcher.paused) {
                this.dispatcher.resume();
                this.logger.logResume(msg)
                this.statusMessage.resume();
            } else {
                this.dispatcher.pause();
                this.logger.logPause(msg);
                this.statusMessage.pause();
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
        const info = await ytdl.getInfo(`https://youtu.be/${this.musicQueue.getQueue()[0].id}`);
        const audioUrls = info.formats.filter((format) => {
            return format.audioBitrate;
        }).sort((a, b) => {
            return b.audioBitrate - a.audioBitrate;
        });

        miniget(audioUrls[0].url).pipe(fs.createWriteStream('audioStream'));

        await new Promise(done => setTimeout(done, 1000));

        this.dispatcher = this.connection.play(fs.createReadStream('audioStream'), {
            bitrate: this.connection.channel.bitrate / 1000,
            volume: 0.2
        });
        this.dispatcher.on('start', () => {

        });
        this.dispatcher.on('end', () => {
            this.musicQueue.proceedToNextSong();
            if (this.musicQueue.getQueue().length > 0) {
                this.play(connection);
            } else {
                this.musicQueue.clearQueue();
            }
        });
    }

    private listenToConnectionEvents() {
        this.connection.on('disconnect', () => {
            this.connection = null;
            this.musicQueue.clearQueue();
        })
    }
}