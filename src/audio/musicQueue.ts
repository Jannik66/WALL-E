import { EventEmitter } from 'events';

import shuffle from 'shuffle-array';

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

    public addToFirstPlace(song: Song) {
        if (this._musicQueue.length > 0) {
            this._musicQueue.splice(1, 0, song);
        } else {
            this._musicQueue.push(song);
        }
        this.emit('songAdded', this._musicQueue);
    }

    public proceedToNextSong() {
        this._musicQueue.shift();
        if (this._musicQueue.length > 0) {
            this.emit('proceededToNextSong', this._musicQueue);
        } else {
            this.emit('queueCleared');
        }
    }

    public shuffleQueue() {
        let playling = this._musicQueue[0];
        let upcoming = [...this._musicQueue];
        upcoming.shift();
        upcoming = shuffle(upcoming);
        this._musicQueue = [playling, ...upcoming];
        this.emit('queueShuffled', this._musicQueue);
    }

    public clearQueue() {
        this._musicQueue = [];
        this.emit('queueCleared');
    }

    public clearUpcomingQueue() {
        this._musicQueue = [this._musicQueue[0]];
        this.emit('upcomingQueueCleared', this._musicQueue);
    }

    public getQueue() {
        return this._musicQueue;
    }

}