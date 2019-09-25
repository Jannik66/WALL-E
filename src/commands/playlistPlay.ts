import { BotCommand, BotClient } from '../customInterfaces';
import { Message, Client, MessageEmbed } from 'discord.js';
import { AudioPlayer } from '../audio/audioPlayer';
import { Logger } from '../logger';
import shuffle from 'shuffle-array';
import config from '../config';
import { Playlists } from '../entities/playlists';

export default class playlistPlayCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 10,
        name: 'playlistplay',
        category: 'Playlist',
        description: 'Adds all songs of the given playlist.',
        argsRequired: true,
        admin: false,
        aliases: ['pp'],
        usage: 'playlistplay [playlistname | id]',
        examples: ['playlistplay [playlistname | id]']
    }

    private _botClient: BotClient;

    private _client: Client;

    private _audioPlayer: AudioPlayer;

    private _logger: Logger;

    public initCommand(botClient: BotClient) {
        this._botClient = botClient;
        this._client = this._botClient.getClient();
        this._audioPlayer = this._botClient.getAudioPlayer();
        this._logger = this._botClient.getLogger();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        let playlistIdentifier = args[0];
        let playlist: Playlists;
        if (playlistIdentifier.match(/^[0-9]*$/)) {
            playlist = await this._botClient.getDBConnection().getPlaylistsRepository().findOne({ where: { id: playlistIdentifier }, relations: ['songs'] });
            if (!playlist) {
                this._sendMessage(msg, `:x: ${msg.author.toString()}, playlist with ID ${playlistIdentifier} not found.`);
                return;
            }
        } else {
            playlist = await this._botClient.getDBConnection().getPlaylistsRepository().findOne({ where: { name: playlistIdentifier }, relations: ['songs'] });
            if (!playlist) {
                this._sendMessage(msg, `:x: ${msg.author.toString()}, playlist with name ${playlistIdentifier} not found.`);
                return;
            }
        }
        if (playlist.songs.length === 0) {
            this._sendMessage(msg, `:x: ${msg.author.toString()}, playlist as 0 songs. Bruh.`);
            return;
        }

        let songs = shuffle(playlist.songs);
        for (const song of songs) {
            this._audioPlayer.addVideo(msg.member.voice.channel, { name: song.name, requester: msg.author.id, id: song.id, length: song.length.toString() });
        };
        let embed = new MessageEmbed();
        embed.setColor(0x007BFF);
        embed.setAuthor(`${msg.author.username}`, `${msg.author.avatarURL()}`);
        embed.setTimestamp(new Date());
        embed.setTitle(`Enqueued ${playlist.songs.length} Songs from playlist ${playlist.name}.`);
        this._logger.logEmbed(embed);
        msg.delete();
    }

    private _sendMessage(msg: Message, text: string) {
        if (msg.channel.id === config.wallEChannelID) {
            msg.channel.send(text);
        } else {
            msg.delete();
            this._logger.logText(text);
        }
    }

}