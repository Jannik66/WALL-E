import { Client, TextChannel, Message, MessageEmbed, User } from 'discord.js';
import { Connection } from 'typeorm';
import moment from 'moment';

import { BotClient, QueueSong } from '../customInterfaces';
import { StatusMessages } from '../messages/statusMessages';
import { Song } from '../entities/song';
import { DBUser } from '../entities/user';
import { UserSong } from '../entities/userSong';

export class Logger {

    private _client: Client;

    private _logChannel: TextChannel;

    private _connection: Connection;

    private _statusMessages: StatusMessages;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._connection = this._botClient.getDatabase().getConnection();
        this._statusMessages = this._botClient.getStatusMessages();
    }

    // send help message to log channel
    public logHelp(msg: Message, helpEmbed: MessageEmbed) {
        this._logChannel.send(`${msg.author.toString()}`).then(() => {
            this._logChannel.send(helpEmbed);
        });
    }

    // log song request
    public logSong(msg: Message, song: QueueSong) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x007BFF');

        embed.addField(song.name, `https://youtu.be/${song.id}`);
        this._logChannel.send(embed);
    }

    // log skip
    public logSkip(msg: Message) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        embed.setTitle(':fast_forward: Skipped');
        this._logChannel.send(embed);
    }

    // log leave
    public logLeave(user: User) {
        const embed = this._createEmbed(user.username, user.avatarURL(), '0x28A745');

        embed.setTitle(':no_entry_sign: Left');
        this._logChannel.send(embed);
    }

    public logShuffle(msg: Message) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        embed.setTitle(':1234: Shuffled the queue.');
        this._logChannel.send(embed);
    }

    public logLoop(msg: Message, enable: boolean, entireQueue: boolean) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        if (enable && entireQueue) {
            embed.setTitle(':repeat: Enabled Loop for the entire queue.');
        } else if (enable) {
            embed.setTitle(':repeat_one: Enabled Loop for one song.');
        } else {
            embed.setTitle(':arrow_right: Disabled loop.');
        }

        this._logChannel.send(embed);
    }

    public logClear(msg: Message) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        embed.setTitle(':no_entry_sign: Cleared the upcoming queue.');
        this._logChannel.send(embed);
    }

    // log pause
    public logPause(msg: Message) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        embed.setTitle(':pause_button: Paused');
        this._logChannel.send(embed);
    }

    // log resume
    public logResume(msg: Message) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        embed.setTitle(':arrow_forward: Resumed');
        this._logChannel.send(embed);
    }

    // log any error (provide error as string)
    public logError(userId: string, errorString: string) {
        this._logChannel.send(`<@${userId}>\n${errorString}`);
    }

    public logSuccess(msg: Message, content: string) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        embed.setTitle(content);
        this._logChannel.send(embed);
    }

    public logEmbed(embed: MessageEmbed) {
        this._logChannel.send(embed);
    }

    public logText(text: string) {
        this._logChannel.send(text);
    }

    public async logRestart(msg: Message) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        embed.setTitle(':gear: Restarting...');
        await this._logChannel.send(embed);
    }

    public async logStop(msg: Message) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        embed.setTitle(':octagonal_sign: Stopping...');
        await this._logChannel.send(embed);
    }

    public logEval(msg: Message, args: string[], success: boolean, output: string) {
        const embed = this._createEmbed(msg.author.username, msg.author.avatarURL(), '0x28A745');

        embed.setTitle('\`EVAL:\` ' + `\`${args.join(' ')}\`` + `\n${success ? '\`SUCCESS\`' : '\`ERROR\`'}`);
        if (output.length < 2048) {
            embed.setDescription(output);
        } else {
            embed.setDescription('Can\'t display Output. Exeeds the maximum of 2048 characters..');
        }
        this._logChannel.send(embed);
    }

    // save Song in database
    public async saveSong(newSong: QueueSong) {
        const user = new DBUser();
        user.id = newSong.requester;
        const song = new Song();
        song.id = newSong.id;
        song.name = newSong.name;
        song.length = newSong.length;

        const oldUserSong = await this._connection.getRepository(UserSong).findOne({ where: { user: { id: newSong.requester }, song: { id: newSong.id } } });
        const userSong = new UserSong();
        userSong.user = user;
        userSong.song = song;
        userSong.timestamp = moment().utcOffset(0).toDate();

        await this._connection.manager.save(user);
        await this._connection.manager.save(song);
        await this._connection.manager.save(userSong);

        this._statusMessages.updateSongLeaderboard();
        this._statusMessages.updateDJLeaderboard();
    }

    private _createEmbed(username: string, avatarURL: string, color: string): MessageEmbed {
        const embed = new MessageEmbed();
        embed.setColor(color);
        embed.setAuthor(`${username}`, `${avatarURL}`);
        embed.setTimestamp(new Date());

        return embed;
    }

    public afterInit() {
        this._logChannel = this._client.channels.cache.get(this._botClient.getConfig().logChannelID) as TextChannel;
    }

}