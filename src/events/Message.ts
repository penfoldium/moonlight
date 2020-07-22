import { Event } from '../lib/structures/Event';
import { MoonlightClient } from '../lib/Client';
import { Message } from 'discord.js';
import { BasePool } from '../lib/structures/Pools/Base/BasePool';
import { Command } from '../lib/structures/Command';
import moment from 'moment';

export default class extends Event {
    constructor(client: MoonlightClient, pool: BasePool<string, Event>) {
        super(client, pool, {
            name: 'coreMessage',
            event: 'message'
        })
    }

    public run(message: Message) {
        // Run the monitors
        this.client.monitors.forEach(monitor => {
            if (monitor.ignoreOthers && message.author !== this.client.user) return;
            if (monitor.ignoreSelf && message.author === this.client.user) return;
            if (monitor.ignoreBots && message.author.bot) return;

            monitor.run(message);
        });

        // If the message doesn't start with ANY prefix then return
        if (!this.client.prefixes.some(prefix => message.content.startsWith(prefix))) return;

        // Extract the prefix and the other arguments
        const prefix: string = this.client.prefixes.filter(prefix => message.content.startsWith(prefix))[0];
        const args: string[] = message.content.substring(prefix.length).trim().split(/ +/g)
        if (!args[0]) return;

        const command = args.shift()?.toLowerCase();
        if (!command) return;

        const cmd: Command | null = this.client.commands.get(command.toLowerCase()) || this.client.commands.get((this.client.aliases.get(command.toLowerCase()) as string)) || null;
        if (!cmd) return;

        if (!this.client.owners.some(owner => owner === message.author.id) && this.client.cooldowns.has(cmd)) {
            // Shout-out to this amazing Stack Overflow answer for this solution https://stackoverflow.com/a/53829705
            const cooldownEnd = moment(this.client.cooldowns.get(cmd));
            const now = moment();
            moment.relativeTimeThreshold('ss', 60);
            moment.updateLocale('en', {
                relativeTime: {
                    s: function (number) {
                        return number + ' seconds';
                    }
                }
            });

            const duration = moment.duration(cooldownEnd.diff(now)).humanize();

            return message.channel.send(`You have already used this command recently. Please try again ${duration}.`);
        };

        const cooldownEnd = moment(new Date()).add(cmd.cooldown, 'seconds').toDate();

        this.client.cooldowns.set(cmd, cooldownEnd);

        setTimeout(() => {
            this.client.cooldowns.delete(cmd);
        }, cmd.cooldown * 1000);

        if (cmd.disabled) return message.channel.send(`This command was globally disabled by the bot owner.`);

        if (!cmd.canRunInDM && message.channel.type === 'dm') return;

        if (cmd.nsfw && message.channel.type !== 'dm' && !message.channel.nsfw) return message.channel.send('This command can only be used in NSFW chnanels.');

        cmd.run(message);
    }
}