import { ConnectionOptions, createConnection, Connection, Repository } from 'typeorm';

import config from './config';
import { Song } from './entities/song';
import { DBUser } from './entities/user';
import { Playlist } from './entities/playlist';
import { PlaylistSong } from './entities/playlistSong';
import { UserSong } from './entities/userSong';

// database options
const options: ConnectionOptions = {
    type: 'sqlite',
    database: `${config.rootPath}/database/WALLE.db`,
    entities: [Song, DBUser, UserSong, Playlist, PlaylistSong],
    logging: config.DBLogging
}

export class BotDatabase {

    private _connection: Connection;

    private _userSongRepository: Repository<UserSong>;
    private _playlistRepository: Repository<Playlist>;

    public async initConnection() {
        // init connection to database
        this._connection = await createConnection(options);

        // check if all tables are correct and generate scaffolding
        await this._connection.synchronize();

         // save repository to property
         this._userSongRepository = this._connection.getRepository(UserSong);
         this._playlistRepository = this._connection.getRepository(Playlist);

        return this;
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

}