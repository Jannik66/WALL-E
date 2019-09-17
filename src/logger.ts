import { BotClient } from './customInterfaces';
import { Client, TextChannel, Message, MessageEmbed } from 'discord.js';
import config from './config';
import { Repository } from 'typeorm';
import { Songs } from './entities/songs';
import { StatusMessages } from './statusMessages';

export class Logger {

    BotClient: BotClient;

    client: Client;

    logChannel: TextChannel;

    songRepsitory: Repository<Songs>;

    statusMessages: StatusMessages;

    public init(bot: BotClient) {
        this.BotClient = bot;
        this.client = this.BotClient.getClient();
    }

    public logHelp(msg: Message, helpEmbed: MessageEmbed) {
        this.logChannel.send(`${msg.author.toString()}`).then(() => {
            this.logChannel.send(helpEmbed);
        });
    }

    public logSong(msg: Message, songInfo: { name: string, id: string }) {
        let embed = new MessageEmbed();
        embed.setColor(0x007BFF);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.addField(songInfo.name, `https://youtu.be/${songInfo.id}`);
        this.logChannel.send(embed);
        this.saveSong(msg, songInfo);
    }

    public logSkip(msg: Message) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':fast_forward: Skipped');
        this.logChannel.send(embed);
    }

    public logLeave(msg: Message) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':no_entry_sign: Left');
        this.logChannel.send(embed);
    }

    public logPause(msg: Message) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':pause_button: Paused');
        this.logChannel.send(embed);
    }

    public logResume(msg: Message) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':arrow_forward: Resumed');
        this.logChannel.send(embed);
    }

    public logError(msg: Message, errorString: string) {
        this.logChannel.send(`${msg.author.toString()}\n${errorString}`);
    }

    public async saveSong(msg: Message, songInfo: { name: string, id: string }) {
        let song = await this.songRepsitory.findOne({ where: { id: songInfo.id, userID: msg.author.id } });
        if (song) {
            await this.songRepsitory.update({ id: songInfo.id, userID: msg.author.id }, { timesPlayed: song.timesPlayed + 1 });
        } else {
            await this.songRepsitory.insert({ id: songInfo.id, userID: msg.author.id, name: songInfo.name, timesPlayed: 1 });
        }
        this.statusMessages.updateSongLeaderboard();
        this.statusMessages.updateDJLeaderboard();
    }

    public afterInit() {
        this.logChannel = this.client.channels.get(config.logChannelID) as TextChannel;
        this.songRepsitory = this.BotClient.getDBConnection().getSongsRepository();
        this.statusMessages = this.BotClient.getStatusMessages();
    }

}