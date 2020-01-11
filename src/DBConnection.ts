import { ConnectionOptions, createConnection, Connection, Repository } from 'typeorm';

import config from './config';
import { Songs } from './entities/songs';
import { Playlists } from './entities/playlists';
import { PlaylistSongs } from './entities/playlistSongs';

// database options
const options: ConnectionOptions = {
    type: 'sqlite',
    database: `${config.rootPath}/database/WALLE.db`,
    entities: [Songs, Playlists, PlaylistSongs],
    logging: config.DBLogging
}

export class BotDatabase {

    private _connection: Connection;

    private _songsRepository: Repository<Songs>;

    private _playlistsRepository: Repository<Playlists>;

    public async initConnection() {
        // init connection to database
        this._connection = await createConnection(options);

        // check if all tables are correct and generate scaffolding
        await this._connection.synchronize();

        // save reposiotry to property
        this._songsRepository = this._connection.getRepository(Songs);
        this._playlistsRepository = this._connection.getRepository(Playlists);

        return this;
    }

    // getter for the database connection
    public getConnection() {
        return this._connection;
    }

    // getter for the Songs Repository
    public getSongsRepository() {
        return this._songsRepository;
    }
    public getPlaylistsRepository() {
        return this._playlistsRepository;
    }

}