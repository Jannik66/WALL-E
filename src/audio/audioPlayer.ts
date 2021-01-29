import fs from 'fs';

import { Client, Message, StreamDispatcher, VoiceConnection, VoiceChannel } from 'discord.js';
import * as ytdl from 'ytdl-core';
import miniget from 'miniget';

import { BotClient, QueueSong } from '../customInterfaces';
import { StatusMessages } from '../messages/statusMessages';
import { Logger } from '../messages/logger';
import { MusicQueue } from './musicQueue';
import config from '../config';

export class AudioPlayer {

    private _client: Client;

    private _statusMessage: StatusMessages;

    private _connection: VoiceConnection;

    private _dispatcher: StreamDispatcher;

    private _logger: Logger;

    private _musicQueue: MusicQueue;

    private _leaveTimeout: NodeJS.Timeout;

    private _skipped: boolean;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._statusMessage = this._botClient.getStatusMessages();
        this._logger = this._botClient.getLogger();
        this._musicQueue = this._botClient.getMusicQueue();
        this._listenToQueue();
    }

    /**
     * Add a video to the queue, if it is the first one, start playing it
     * @param voiceChannel voice Channel to join
     * @param song requested song
     */
    public addVideo(voiceChannel: VoiceChannel, song: QueueSong) {
        this._musicQueue.addToQueue(song);
        if (this._musicQueue.getQueue().length === 1) {
            this._initConnection(voiceChannel);
        }
    }

    /**
     * Add a video to the queue, if it is the first one, start playing it
     * @param voiceChannel voice Channel to join
     * @param song requested song
     */
    public addVideoNow(voiceChannel: VoiceChannel, song: QueueSong) {
        this._musicQueue.addToFirstPlace(song);
        if (this._musicQueue.getQueue().length === 1) {
            this._initConnection(voiceChannel);
        }
    }

    /**
     * Skips a song.
     * @param msg message which requested to skip. Used to reference the author in the log channel.
     */
    public skip(msg: Message) {
        if (this._dispatcher) {
            this._skipped = true;
            this._dispatcher.end();
            this._logger.logSkip(msg);
        } else {
            this._logger.logError(msg.author.id, `:no_entry_sign: I'm not playing anything.`);
        }
    }

    /**
     * Bot leaves the voice channel and the queue gets cleared
     * @param msg message which requested to skip. Used to reference the author in the log channel.
     */
    public leave(msg?: Message) {
        if (msg) {
            msg.guild.member(this._client.user).voice.channel.leave();
            this._logger.logLeave(msg.author);
        } else {
            if (this._client.guilds.cache.get(config.BDCGuildID).member(this._client.user).voice.channel) {
                this._client.guilds.cache.get(config.BDCGuildID).member(this._client.user).voice.channel.leave();
                this._logger.logLeave(this._client.user);
            }
        }
    }

    /**
     * Pauses or resumes the dispatcher
     * @param msg message which requested to skip. Used to reference the author in the log channel.
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
            this._logger.logError(msg.author.id, `:no_entry_sign: I'm not playing anything.`);
        }
    }

    /**
     * Change loop parameter (enable or disable, one song or entire queue)
     * @param msg message which requested to skip. Used to reference the author in the log channel.
     * @param entireQueue if entire queue has to be looped.
     */
    public loop(msg: Message, entireQueue: boolean) {
        if (this._dispatcher) {
            this._musicQueue.changeLoop(entireQueue ? true : !this._musicQueue.loop.enabled, entireQueue);
            this._logger.logLoop(msg, this._musicQueue.loop.enabled, entireQueue);
        } else {
            this._logger.logError(msg.author.id, `:no_entry_sign: I'm not playing anything.`);
        }
    }

    /**
     * Init voice connection and start playing song
     * @param voiceChannel voice Channel to join
     */
    private async _initConnection(voiceChannel: VoiceChannel) {
        if (!this._connection) {
            this._connection = await voiceChannel.join();
            this._listenToConnectionEvents();
        }
        this._loadAudioURL();
    }

    /**
     * load video URL
     */
    private async _loadAudioURL() {
        const info = await ytdl.getInfo(`https://youtu.be/${this._musicQueue.getQueue()[0].id}`);

        // check if the video is playable and throw error if not
        if (info.player_response.playabilityStatus.status === 'UNPLAYABLE') {
            this._logger.logError(this._musicQueue.getQueue()[0].requester, `:x: Welp, the song with id \`${this._musicQueue.getQueue()[0].id}\` couldn't be played and got skipped.\nPlease check if this video is still available here: https://youtu.be/${this._musicQueue.getQueue()[0].id}.\nSorry :/`);
            this._musicQueue.proceedToNextSong(false);
            if (this._musicQueue.getQueue().length > 0) {
                this._loadAudioURL();
            }
            return;
        }

        // get audioUrl with the best quality (Bitrate under 128)
        const audioUrl = info.formats.filter((format: any) => {
            return format.audioBitrate <= 128;
        }).sort((a: any, b: any) => {
            return b.audioBitrate - a.audioBitrate;
        })[0].url;

        if (audioUrl.startsWith('https://manifest')) {
            const body = await miniget(audioUrl).text();
            let url = body.substring(body.indexOf('<BaseURL>') + 9, body.indexOf('</BaseURL>'));
            this._play(url);
        } else {
            this._play(audioUrl);
        }
    }

    private async _play(url: string) {
        if (!this._musicQueue.loop.enabled) {
            this._logger.saveSong(this._musicQueue.getQueue()[0]);
        }
        let audioStream = fs.createWriteStream('audioStream');
        miniget(url, { maxRedirects: 10 }).pipe(audioStream);

        // loop and check if miniget started writing to file
        // if it has started, wait 100 ms more and than proceed to play audio
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
        this._dispatcher.on('finish', () => {
            this._musicQueue.proceedToNextSong(this._skipped);
            if (this._skipped) {
                this._skipped = false;
            }
            if (this._musicQueue.getQueue().length > 0) {
                this._loadAudioURL();
            }
        });
    }

    private _listenToConnectionEvents() {
        // if the voice connection disconnects, clear queue and empty property
        this._connection.on('disconnect', () => {
            this._connection = null;
            this._musicQueue.clearQueue();
        })
    }

    private _listenToQueue() {
        this._musicQueue.on('queueCleared', () => {
            this._leaveTimeout = setTimeout(() => {
                this.leave();
            }, 5 * 60 * 1000);
        });
        this._musicQueue.on('songAdded', () => {
            if (this._leaveTimeout) {
                clearTimeout(this._leaveTimeout);
            }
        });
    }
}