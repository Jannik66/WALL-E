import { BotClient, Song } from './customInterfaces';
import { Client } from 'discord.js';
import { EventEmitter } from 'events';

export class MusicQueue extends EventEmitter {

    BotClient: BotClient;

    client: Client;

    musicQueue: Array<Song> = [];

    public init(bot: BotClient) {
        this.BotClient = bot;
        this.client = this.BotClient.getClient();
    }

    public addToQueue(song: Song) {
        this.musicQueue.push(song);
        this.emit('songAdded', this.musicQueue);
    }

    public proceedToNextSong() {
        this.musicQueue.shift();
        if (this.musicQueue.length > 0) {
            this.emit('proceededToNextSong', this.musicQueue);
        } else {
            this.emit('queueCleared', this.musicQueue);
        }
    }

    public clearQueue() {
        this.musicQueue = [];
        this.emit('queueCleared', this.musicQueue);
    }

    public getQueue() {
        return this.musicQueue;
    }

}