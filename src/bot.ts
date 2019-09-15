import { Client, Collection } from 'discord.js';
import fs from 'fs';
import config from './config';
import readyListener from './listeners/readyListener';
import messageListener from './listeners/messageListener';
import { BotDatabase } from './DBConnection';
import { BotCommand, BotClient } from './customInterfaces';
import { AudioPlayer } from './audioPlayer';
import { Logger } from './logger';
import { StatusMessages } from './statusMessages';

export class WALLEBot implements BotClient {
    // Discord Client of the Bot
    private _client: Client;

    // All available commands (in folder 'commands')
    private _commands: Collection<string, BotCommand>;

    // Bot SQLite Database
    private _BotDB: BotDatabase;

    private _audioPlayer: AudioPlayer;

    private _logger: Logger;

    private _statusMessages: StatusMessages;

    // Listeners
    private _messageListener: messageListener;
    private _readyListener: readyListener;

    public async start() {
        this._client = new Client();
        await new BotDatabase().initConnection().then((BotDB) => {
            this._BotDB = BotDB;
        });

        this._audioPlayer = new AudioPlayer();
        this._logger = new Logger();
        this._statusMessages = new StatusMessages();

        this._messageListener = new messageListener();
        this._readyListener = new readyListener();

        this._audioPlayer.init(this);
        this._logger.init(this);
        this._statusMessages.init(this);
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

    public getAudioPlayer() {
        return this._audioPlayer;
    }

    public getLogger() {
        return this._logger;
    }

    public getStatusMessages() {
        return this._statusMessages;
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
        this._audioPlayer.afterInit();
        this._logger.afterInit();
        this._statusMessages.afterInit();
        for (let command of this._commands) {
            if (command[1].information.hasAfterInit) {
                command[1].afterInit()
            }
        }
    }
}