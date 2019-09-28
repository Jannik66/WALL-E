import fs from 'fs';

import { Client, Message, StreamDispatcher, VoiceConnection, VoiceChannel } from 'discord.js';
import * as ytdl from 'ytdl-core';
// @ts-ignore
import miniget from 'miniget';

import { BotClient, Song } from '../customInterfaces';
import { StatusMessages } from '../messages/statusMessages';
import { Logger } from '../messages/logger';
import { MusicQueue } from './musicQueue';

export class AudioPlayer {

    private _client: Client;

    private _statusMessage: StatusMessages;

    private _connection: VoiceConnection;

    private _dispatcher: StreamDispatcher;

    private _logger: Logger;

    private _musicQueue: MusicQueue;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._statusMessage = this._botClient.getStatusMessages();
        this._logger = this._botClient.getLogger();
        this._musicQueue = this._botClient.getMusicQueue();
    }

    /**
     * Add a video to the queue, if it is the first one, start playing it
     * @param voiceChannel voice Channel to join
     * @param song requested song
     */
    public addVideo(voiceChannel: VoiceChannel, song: Song) {
        this._musicQueue.addToQueue(song);
        if (this._musicQueue.getQueue().length === 1) {
            this.initConnection(voiceChannel);
        }
    }

    /**
     * Skips a song.
     * @param msg message wich requested to skip. Used to reference the author in the log channel.
     */
    public skip(msg: Message) {
        if (this._dispatcher) {
            this._dispatcher.end();
            this._logger.logSkip(msg);
        } else {
            this._logger.logError(msg, `:no_entry_sign: I'm not playing anything.`);
        }
    }

    /**
     * Bot leaves the voice channel and the queue gets cleared
     * @param msg message wich requested to skip. Used to reference the author in the log channel.
     */
    public leave(msg: Message) {
        msg.guild.member(this._client.user).voice.channel.leave();
        this._musicQueue.clearQueue();
        this._logger.logLeave(msg);
    }

    /**
     * Pauses or resumes the dispatcher
     * @param msg message wich requested to skip. Used to reference the author in the log channel.
     */
    public pause(msg: Message) {
        if (this._dispatcher) {
            if (this._dispatcher.paused) {
                this._dispatcher.resume();
                this._logger.logResume(msg)
                this._statusMessage.resume();
            } else {
                this._dispatcher.pause();
                this._logger.logPause(msg);
                this._statusMessage.pause();
            }
        } else {
            this._logger.logError(msg, `:no_entry_sign: I'm not playing anything.`);
        }
    }

    /**
     * Init voice connection and start playing song
     * @param voiceChannel voice Channel to join
     */
    private async initConnection(voiceChannel: VoiceChannel) {
        if (!this._connection) {
            this._connection = await voiceChannel.join();
            this.listenToConnectionEvents();
        }
        this.loadAudioURL();
    }

    /**
     * load video URL
     */
    private async loadAudioURL() {
        const info = await ytdl.getInfo(`https://youtu.be/${this._musicQueue.getQueue()[0].id}`);
        const audioUrl = info.formats.find((format) => {
            return format.audioBitrate === 128;
        }).url;

        if (audioUrl.startsWith('https://manifest')) {
            miniget(audioUrl, (err: any, req: any, body: string) => {
                let url = body.substring(body.indexOf('<BaseURL>') + 9, body.indexOf('</BaseURL>'));
                this.play(url);
            });
        } else {
            this.play(audioUrl);
        }
    }

    private async play(Url: string) {
        this._logger.saveSong(this._musicQueue.getQueue()[0]);
        let audioStream = fs.createWriteStream('audioStream');
        miniget(Url).pipe(audioStream);

        // loop and check if miniget started writing to file
        // if it has started, wait 500 ms more and than proceed to play audio
        await new Promise((done: any) => {
            let interval = setInterval(async () => {
                if (audioStream.bytesWritten > 1) {
                    clearInterval(interval);
                    await new Promise(done => setTimeout(done, 500));
                    done();
                }
            }, 100);
        });

        // read Stream from audioStream file and play it
        this._dispatcher = this._connection.play(fs.createReadStream('audioStream'), {
            bitrate: this._connection.channel.bitrate / 1000,
            volume: 0.1
        });

        // if dispatcher ends, proceed to next song
        this._dispatcher.on('end', () => {
            this._musicQueue.proceedToNextSong();
            if (this._musicQueue.getQueue().length > 0) {
                this.loadAudioURL();
            }
        });
    }

    private listenToConnectionEvents() {
        // if the voice connection disconnects, clear queue and empty property
        this._connection.on('disconnect', () => {
            this._connection = null;
            this._musicQueue.clearQueue();
        })
    }
}