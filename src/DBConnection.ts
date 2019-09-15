import { ConnectionOptions, createConnection, Connection, Repository } from 'typeorm';
import config from './config';
import { Songs } from './entities/songs';

const options: ConnectionOptions = {
    type: 'sqlite',
    database: `${config.rootPath}/database/WALLE.db`,
    entities: [Songs],
    logging: config.DBLogging
}

export class BotDatabase {

    connection: Connection;

    songsRepository: Repository<Songs>;

    public async initConnection() {
        this.connection = await createConnection(options);
        await this.connection.synchronize();

        this.songsRepository = this.connection.getRepository(Songs);

        return this;
    }

    public getConnection() {
        return this.connection;
    }

    public getSongsEventRepository() {
        return this.songsRepository;
    }

}