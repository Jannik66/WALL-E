import { Client, Collection } from 'discord.js';
import fs from 'fs';
import config from './config';
import readyListener from './listeners/readyListener';
import messageListener from './listeners/messageListener';
import { BotDatabase } from './DBConnection';
import { BotCommand, BotClient } from './customInterfaces';
import { AudioPlayer } from './audio/audioPlayer';
import { Logger } from './logger';
import { StatusMessages } from './statusMessages';
import { MusicQueue } from './audio/musicQueue';

export class WALLEBot implements BotClient {
    // Discord Client of the Bot
    private _client: Client;

    // All available commands (in folder 'commands')
    private _commands: Collection<string, BotCommand>;

    // Bot SQLite Database
    private _BotDB: BotDatabase;

    // audioPlayer which manages the entire audio/song stuff
    private _audioPlayer: AudioPlayer;

    // logger which logs messages in the logChannel and updates the database
    private _logger: Logger;

    // statusMessage updater which updates the message in the #wall-e channel
    private _statusMessages: StatusMessages;

    private _musicQueue: MusicQueue;

    // Listeners
    private _messageListener: messageListener;
    private _readyListener: readyListener;

    // initial start method
    public async start() {
        // create new client
        this._client = new Client({
            restRequestTimeout: 30000
        });

        // init database connection
        await new BotDatabase().initConnection().then((BotDB) => {
            this._BotDB = BotDB;
        });

        // create audioPlayer, logger and statusMessages
        this._audioPlayer = new AudioPlayer();
        this._logger = new Logger();
        this._statusMessages = new StatusMessages();
        this._musicQueue = new MusicQueue();

        // create listnerers
        this._messageListener = new messageListener();
        this._readyListener = new readyListener();

        // init audioPlayer, logger and statusMessages
        this._audioPlayer.init(this);
        this._logger.init(this);
        this._statusMessages.init(this);
        this._musicQueue.init(this);

        // init listeners
        this._messageListener.init(this);
        this._readyListener.init(this);

        // load all commands
        this.loadCommands();

        // init event listeners
        this.initEvents();

        this._client.login(config.botToken);
    }

    /**
     * getters
     * 
     */
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
    public getMusicQueue() {
        return this._musicQueue;
    }
    public getAllCommands() {
        return this._commands;
    }

    // init event listeners
    private initEvents() {
        this._client.on('ready', async () => this._readyListener.evalReady());
        this._client.on('message', async (msg) => this._messageListener.evalMessage(msg));
    }

    // load all commands
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

    // methods which need a logged in client. Call after bot is ready (called by ready listener)
    public afterInit() {
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