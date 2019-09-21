import { ConnectionOptions, createConnection, Connection, Repository } from 'typeorm';
import config from './config';
import { Songs } from './entities/songs';
import { VoiceStats } from './entities/voiceStats';

// database options
const options: ConnectionOptions = {
    type: 'sqlite',
    database: `${config.rootPath}/database/WALLE.db`,
    entities: [Songs, VoiceStats],
    logging: config.DBLogging
}

export class BotDatabase {

    private _connection: Connection;

    private _songsRepository: Repository<Songs>;

    private _voiceStatsRepository: Repository<VoiceStats>;

    public async initConnection() {
        // init connection to database
        this._connection = await createConnection(options);

        // check if all tables are correct and generate scaffolding
        await this._connection.synchronize();

        // save reposiotry to property
        this._songsRepository = this._connection.getRepository(Songs);
        this._voiceStatsRepository = this._connection.getRepository(VoiceStats);

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
    public getVoiceStatsRepository() {
        return this._voiceStatsRepository;
    }

}