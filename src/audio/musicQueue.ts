import { EventEmitter } from 'events';

import shuffle from 'shuffle-array';

import { BotClient, QueueSong } from '../customInterfaces';

export class MusicQueue extends EventEmitter {

    private _musicQueue: Array<QueueSong> = [];

    public loop: { enabled: boolean, entireQueue: boolean } = { enabled: false, entireQueue: false };

    constructor(private _botClient: BotClient) {
        super();
    }

    public addToQueue(song: QueueSong) {
        this._musicQueue.push(song);
        this.emit('songAdded', this._musicQueue);
    }

    public addToFirstPlace(song: QueueSong) {
        if (this._musicQueue.length > 0) {
            this._musicQueue.splice(1, 0, song);
        } else {
            this._musicQueue.push(song);
        }
        this.emit('songAdded', this._musicQueue);
    }

    public proceedToNextSong(skipped: boolean) {
        if (this.loop.entireQueue) {
            this._musicQueue.push(this._musicQueue[0]);
            this._musicQueue.shift();
        } else if (!this.loop.enabled || skipped) {
            this._musicQueue.shift();
        }
        if (this._musicQueue.length > 0) {
            this.emit('proceededToNextSong', this._musicQueue);
        } else {
            this.loop = { enabled: false, entireQueue: false };
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

    public changeLoop(enable: boolean, entireQueue: boolean) {
        this.loop = { enabled: enable, entireQueue: enable ? entireQueue : false };
        this.emit('updatedLoop', this._musicQueue);
    }

    public clearQueue() {
        this._musicQueue = [];
        this.loop = { enabled: false, entireQueue: false };
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