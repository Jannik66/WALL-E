import { EventEmitter } from 'events';

import { BotClient, Song } from '../customInterfaces';

export class MusicQueue extends EventEmitter {

    private _musicQueue: Array<Song> = [];

    constructor(private _botClient: BotClient) {
        super();
    }

    public addToQueue(song: Song) {
        this._musicQueue.push(song);
        this.emit('songAdded', this._musicQueue);
    }

    public proceedToNextSong() {
        this._musicQueue.shift();
        if (this._musicQueue.length > 0) {
            this.emit('proceededToNextSong', this._musicQueue);
        } else {
            this.emit('queueCleared', this._musicQueue);
        }
    }

    public clearQueue() {
        this._musicQueue = [];
        this.emit('queueCleared', this._musicQueue);
    }

    public getQueue() {
        return this._musicQueue;
    }

}