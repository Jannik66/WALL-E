import { BotClient } from '../customInterfaces';

export default class readyListener {

    BotClient: BotClient;

    public init(BotClient: BotClient) {
        this.BotClient = BotClient;
    }

    public async evalReady() {
        this.BotClient.afterInit();
        console.log(`Logged in as ${this.BotClient.getClient().user.tag}`);
    }
}