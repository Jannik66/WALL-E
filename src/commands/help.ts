import { Message, Collection, MessageEmbed, Client } from 'discord.js';

import { BotCommand, BotClient } from '../customInterfaces';
import { Logger } from '../messages/logger';
import config from '../config';

export default class helpCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 0,
        name: 'help',
        category: 'Information',
        description: 'Displays all available commands.',
        argsRequired: false,
        admin: false,
        aliases: ['h'],
        usage: 'help',
        examples: ['help', 'help addEvent']
    }

    private _client: Client;

    private _commands: Collection<string, BotCommand>;

    private _logger: Logger;

    constructor(private _botClient: BotClient) {
        this._client = this._botClient.getClient();
        this._commands = this._botClient.getAllCommands();
        this._logger = this._botClient.getLogger();
    }

    public execute(msg: Message, args: string[], prefix: string) {
        // set up embed
        let embed = new MessageEmbed();
        embed.setColor(0xEDD5BD);
        embed.setAuthor(`${this._client.user.username}`, `${this._client.user.avatarURL()}`);
        embed.setFooter('Pridefully serving the BDC-Server.');

        // search for a command to display help for
        const command = this._commands.get(args[0]) || this._commands.find(cmd => cmd.information.aliases && cmd.information.aliases.includes(args[0]));

        // if a command was found, set up help message for it
        if (command) {
            embed.setTitle(`Commandinfo \`${command.information.name}\``);
            embed.addField(`Description`, `${command.information.description}`);
            embed.addField(`Category`, `${command.information.category}`);
            embed.addField(`Usage`, `\`${prefix}${command.information.usage}\``);
            if (command.information.aliases.length > 0) {
                let aliases: string;
                for (let alias of command.information.aliases) {
                    if (aliases) {
                        aliases += `, \`${alias}\``;
                    } else {
                        aliases = `\`${alias}\``;
                    }
                }
                embed.addField(`Aliases`, `${aliases}`);
            }
            if (command.information.examples) {
                let examples: string;
                for (let example of command.information.examples) {
                    if (examples) {
                        examples += `\n\`${prefix}${example}\``;
                    } else {
                        examples = `\`${prefix}${example}\``;
                    }
                }
                embed.addField(`Example`, `${examples}`);
            }

            // send help message to log channel
            this._sendEmbedMessage(msg, embed);
        } else if (args[0]) {
            // if no command was found, send error message
            this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, the command \`${args[0]}\` was not found.`);
        } else {
            // set up general help message
            embed.setTitle(`Commands`);
            embed.setDescription(`To get detailed information about a command, type \`${prefix}help {command}\``);
            let fields: {
                [key: string]: string
            } = {};
            for (const command of this._commands) {
                if (fields[`${command[1].information.category}`]) {
                    fields[`${command[1].information.category}`] += `\n**${prefix}${command[1].information.name}**\n${command[1].information.description}`;
                } else {
                    fields[`${command[1].information.category}`] = `**${prefix}${command[1].information.name}**\n${command[1].information.description}`;
                }
            }

            for (const key in fields) {
                embed.addField(`►${key}◄`, fields[key]);
            }
            this._sendEmbedMessage(msg, embed);
        }

    }

    private _sendMessage(msg: Message, text: string) {
        if (msg.channel.id === config.wallEChannelID) {
            msg.channel.send(text);
        } else {
            msg.delete();
            this._logger.logText(text);
        }
    }

    private _sendEmbedMessage(msg: Message, embed: MessageEmbed) {
        if (msg.channel.id === config.wallEChannelID) {
            msg.channel.send(embed);
        } else {
            msg.delete();
            this._logger.logEmbed(embed);
        }
    }

}