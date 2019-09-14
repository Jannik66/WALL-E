import { Client, Collection, Message } from "discord.js";
import { BotDatabase } from "./DBConnection";

export interface BotClient {
    getClient(): Client,
    getDBConnection(): BotDatabase,
    getAllCommands(): Collection<string, BotCommand>,
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
    BotClient: BotClient,
    initCommand(BotClient: BotClient): void,
    afterInit?(): void,
    execute(msg: Message, args: string[], prefix: string): void
}

/**
 * General Config
 */
export interface BotConfig {
    logChannelID: string,
    botToken: string,
    prefix: string,
    botID: string,
    rootPath: string,
    DBLogging: boolean
}