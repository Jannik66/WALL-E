import { Client, TextChannel, Message, MessageEmbed, User } from 'discord.js';
import { Repository } from 'typeorm';

import config from '../config';
import { BotClient, Song } from '../customInterfaces';
import { Songs } from '../entities/songs';
import { StatusMessages } from '../messages/statusMessages';

export class Logger {

    private _client: Client;

    private _logChannel: TextChannel;

    private _songRepsitory: Repository<Songs>;

    private _statusMessages: StatusMessages;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._songRepsitory = this._botClient.getDBConnection().getSongsRepository();
        this._statusMessages = this._botClient.getStatusMessages();
    }

    // send help message to log channel
    public logHelp(msg: Message, helpEmbed: MessageEmbed) {
        this._logChannel.send(`${msg.author.toString()}`).then(() => {
            this._logChannel.send(helpEmbed);
        });
    }

    // log song request
    public logSong(msg: Message, song: Song) {
        let embed = new MessageEmbed();
        embed.setColor(0x007BFF);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.addField(song.name, `https://youtu.be/${song.id}`);
        this._logChannel.send(embed);
    }

    // log skip
    public logSkip(msg: Message) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':fast_forward: Skipped');
        this._logChannel.send(embed);
    }

    // log leave
    public logLeave(user: User) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${user.username}`, `${user.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':no_entry_sign: Left');
        this._logChannel.send(embed);
    }

    public logClear(msg: Message) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':no_entry_sign: Cleared the upcoming queue.');
        this._logChannel.send(embed);
    }

    // log pause
    public logPause(msg: Message) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':pause_button: Paused');
        this._logChannel.send(embed);
    }

    // log resume
    public logResume(msg: Message) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':arrow_forward: Resumed');
        this._logChannel.send(embed);
    }

    // log any error (provide error as string)
    public logError(msg: Message, errorString: string) {
        this._logChannel.send(`${msg.author.toString()}\n${errorString}`);
    }

    public logSuccess(msg: Message, content: string) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(content);
        this._logChannel.send(embed);
    }

    public logEmbed(embed: MessageEmbed) {
        this._logChannel.send(embed);
    }

    public logText(text: string) {
        this._logChannel.send(text);
    }

    public async logRestart(msg: Message, ) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':gear: Restarting...');
        await this._logChannel.send(embed);
    }

    public async logStop(msg: Message) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());

        embed.setTitle(':octagonal_sign: Stopping...');
        await this._logChannel.send(embed);
    }

    public logEval(msg: Message, args: string[], success: boolean, output: string) {
        let embed = new MessageEmbed();
        embed.setColor(0x28A745);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());
        embed.setTitle('\`EVAL:\` ' + `\`${args.join(" ")}\`` + `\n${success ? '\`SUCCESS\`' : '\`ERROR\`'}`);
        if (output.length < 2048) {
            embed.setDescription(output);
        } else {
            embed.setDescription('Can\'t display Output. Exeeds the maximum of 2048 characters..');
        }
        this._logChannel.send(embed);
    }

    // save Song in database
    public async saveSong(newSong: Song) {
        let song = await this._songRepsitory.findOne({ where: { id: newSong.id, userID: newSong.requester } });
        if (song) {
            await this._songRepsitory.update({ id: newSong.id, userID: newSong.requester }, { timesPlayed: song.timesPlayed + 1 });
        } else {
            await this._songRepsitory.insert({ id: newSong.id, userID: newSong.requester, name: newSong.name, timesPlayed: 1 });
        }
        this._statusMessages.updateSongLeaderboard();
        this._statusMessages.updateDJLeaderboard();
    }

    public afterInit() {
        this._logChannel = this._client.channels.get(config.logChannelID) as TextChannel;
    }

}