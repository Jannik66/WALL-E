import { Client, Collection, Message } from "discord.js";
import { BotDatabase } from "./DBConnection";
import { AudioPlayer } from "./audioPlayer";
import { Logger } from "./logger";
import { StatusMessages } from "./statusMessages";

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
        hasAfterInit: boolean,
        admin: boolean,
        aliases: string[],
        usage: string,
        examples: string[]
    },
    initCommand(botClient: BotClient): void,
    afterInit?(): void,
    execute(msg: Message, args: string[], prefix: string): void
}

/**
 * General Config
 */
export interface BotConfig {
    logChannelID: string,
    wallEChannelID: string,
    nowPlayingMessageID: string,
    songLeaderboardMessageID: string,
    djLeaderboardMessageID: string,
    botToken: string,
    prefix: string,
    botID: string,
    rootPath: string,
    DBLogging: boolean
}