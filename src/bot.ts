import { Client, Collection } from 'discord.js';
import fs from 'fs';
import config from './config';
import readyListener from './listeners/readyListener';
import messageListener from './listeners/messageListener';
import { BotDatabase } from './DBConnection';
import { BotCommand, BotClient } from './customInterfaces';

export class WALLEBot implements BotClient {
    // Discord Client of the Bot
    private _client: Client;

    // All available commands (in folder 'commands')
    private _commands: Collection<string, BotCommand>;

    // Bot SQLite Database
    private _BotDB: BotDatabase;

    // Listeners
    private _messageListener: messageListener;
    private _readyListener: readyListener;

    public async start() {
        this._client = new Client();
        await new BotDatabase().initConnection().then((BotDB) => {
            this._BotDB = BotDB;
        });

        this._messageListener = new messageListener();
        this._readyListener = new readyListener();

        this._messageListener.init(this);
        this._readyListener.init(this);

        this.loadCommands();

        this.initEvents();

        this._client.login(config.botToken);
    }

    public getClient() {
        return this._client;
    }

    public getDBConnection() {
        return this._BotDB;
    }

    public getAllCommands() {
        return this._commands;
    }

    public getConfig() {
        return config;
    }

    private initEvents() {
        this._client.on('ready', async () => this._readyListener.evalReady());
        this._client.on('message', async (msg) => this._messageListener.evalMessage(msg));
    }

    private loadCommands() {
        this._commands = new Collection();
        const COMMANDFILES = fs.readdirSync(`${config.rootPath}/commands`).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of COMMANDFILES) {
            const COMMAND = require(`./commands/${file}`).default;
            const commandInstance = new COMMAND();
            commandInstance.initCommand(this);
            this._commands.set(commandInstance.information.name.toLowerCase(), commandInstance);
        }
    }

    afterInit() {
        for (let command of this._commands) {
            if (command[1].information.hasAfterInit) {
                command[1].afterInit()
            }
        }
    }
}