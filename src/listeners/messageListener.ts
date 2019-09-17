import { Message, Client } from 'discord.js';
import { BotClient } from '../customInterfaces';
import config from '../config';

export default class messageListener {

    BotClient: BotClient;

    client: Client;

    prefix: string;

    public init(BotClient: BotClient) {
        this.BotClient = BotClient;
        this.client = this.BotClient.getClient();

        // get prefix from config
        this.prefix = config.prefix;
    }

    public async evalMessage(msg: Message) {

        // return if msg is from bot or not sent in a guild
        if (msg.author.bot || !msg.guild) return;

        if (msg.content.startsWith(`<@${this.client.user.id}>`) || msg.content.startsWith(`<@!${this.client.user.id}`)) {
            msg.channel.send(`My prefix on this server is \`${this.prefix}\`\nGet a list of commands with \`${this.prefix}help\``);
            return;
        }

        if (!msg.content.toLowerCase().startsWith(this.prefix.toLowerCase())) return;

        let args = msg.content.slice(this.prefix.length).split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = this.BotClient.getAllCommands().get(commandName) || this.BotClient.getAllCommands().find(cmd => cmd.information.aliases && cmd.information.aliases.includes(commandName));

        // return if no command was found.
        if (!command) return;

        if (command.information.admin && !(msg.member.hasPermission("MANAGE_GUILD"))) {
            msg.channel.send(`:no_entry_sign: Only administrators can execute this command.`);
            return;
        }

        if (command.information.argsRequired && !args.length) {
            let reply = `:no_entry_sign: No arguments were provided`

            reply += `\nUsage: \`${this.prefix}${command.information.usage}\``

            reply += `\nExample:`;

            for (let example of command.information.examples) {
                reply += `\n\`${this.prefix}${example}\``;
            }

            return msg.channel.send(reply);
        }

        try {
            command.execute(msg, args, this.prefix);
        } catch (error) {
            console.error(error);
            msg.channel.send(`Error...`);
        }
    }
}