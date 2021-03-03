import { ConnectionOptions, createConnection, Connection, Repository } from 'typeorm';

import { Song } from './entities/song';
import { DBUser } from './entities/user';
import { Playlist } from './entities/playlist';
import { PlaylistSong } from './entities/playlistSong';
import { UserSong } from './entities/userSong';
import { VoiceStat } from './entities/voiceStat';
import { BotClient } from './customInterfaces';

export class BotDatabase {

    private _connection: Connection;

    private _userSongRepository: Repository<UserSong>;
    private _playlistRepository: Repository<Playlist>;
    private _voiceStatRepository: Repository<VoiceStat>;

    constructor(private _botClient: BotClient) { }

    public async initConnection() {
        // database options
        const options: ConnectionOptions = {
            type: 'sqlite',
            database: this._botClient.getConfig().DBPath,
            entities: [Song, DBUser, UserSong, Playlist, PlaylistSong, VoiceStat],
            logging: this._botClient.getConfig().DBLogging
        }

        // init connection to database
        this._connection = await createConnection(options);

        // check if all tables are correct and generate scaffolding
        await this._connection.synchronize();

        // save repository to property
        this._userSongRepository = this._connection.getRepository(UserSong);
        this._playlistRepository = this._connection.getRepository(Playlist);
        this._voiceStatRepository = this._connection.getRepository(VoiceStat);
    }

    // getter for the database connection
    public getConnection() {
        return this._connection;
    }

    public getUserSongRepository() {
        return this._userSongRepository;
    }
    public getPlaylistRepository() {
        return this._playlistRepository;
    }
    public getVoiceStatRepository() {
        return this._voiceStatRepository;
    }

}