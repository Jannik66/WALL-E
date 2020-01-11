import { Client, Collection, Message } from 'discord.js';

import { Logger } from './messages/logger';
import { BotDatabase } from './DBConnection';
import { AudioPlayer } from './audio/audioPlayer';
import { StatusMessages } from './messages/statusMessages';
import { MusicQueue } from './audio/musicQueue';

/**
 * main client class
 */
export interface BotClient {
    getClient(): Client,
    getDBConnection(): BotDatabase,
    getAllCommands(): Collection<string, BotCommand>,
    getAudioPlayer(): AudioPlayer,
    getLogger(): Logger,
    getStatusMessages(): StatusMessages,
    getMusicQueue(): MusicQueue,
    start(): void,
    afterInit(): void
}

/**
 * Every Bot Command
 */
export interface BotCommand {
    information: {
        id: number,
        name: string,
        category: string,
        description: string,
        argsRequired: boolean,
        admin: boolean,
        aliases: string[],
        usage: string,
        examples: string[]
    },
    afterInit?(): void,
    execute(msg: Message, args: string[], prefix: string): void
}

/**
 * General Config
 */
export interface BotConfig {
    logChannelID: string,
    dashboardChannelID: string,
    wallEChannelID: string,
    nowPlayingMessageID: string,
    songLeaderboardMessageID: string,
    djLeaderboardMessageID: string,
    BDCGuildID: string,
    botOwnerID: string,
    botToken: string,
    prefix: string,
    botID: string,
    rootPath: string,
    DBLogging: boolean
}

/**
 * Song for song queue
 */
export interface Song {
    name: string,
    requester: string,
    id: string,
    length: string
}