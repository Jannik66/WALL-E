import { ConnectionOptions, createConnection, Connection, Repository } from 'typeorm';
import config from './config';

const options: ConnectionOptions = {
    type: 'sqlite',
    database: `${config.rootPath}/database/WALLE.db`,
    entities: [],
    logging: config.DBLogging
}

export class BotDatabase {

    connection: Connection;

    //eventRepository: Repository<CalendarEvent>;

    public async initConnection() {
        this.connection = await createConnection(options);
        await this.connection.synchronize();

        //this.eventRepository = this.connection.getRepository(CalendarEvent);

        return this;
    }

    public getConnection() {
        return this.connection;
    }

    /*public getCalendarEventRepository() {
        return this.eventRepository;
    }*/

}