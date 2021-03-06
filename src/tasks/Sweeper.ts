import { Task, MoonlightClient, BasePool } from '../index';
import { SnowflakeUtil, TextChannel } from 'discord.js';

export default class extends Task {
    constructor(client: MoonlightClient, pool: BasePool<string, Task>) {
        super(client, pool, {
            time: '*/30 * * * *',
        })
    }

    public run() {
        // Copyright (c) 2017-2019 dirigeants. All rights reserved. MIT license.
        // THRESHOLD equals to 30 minutes in milliseconds:
        //     - 1000 milliseconds = 1 second
        //     - 60 seconds        = 1 minute
        //     - 30 minutes
        const THRESHOLD = 1000 * 60 * 30;

        const OLD_SNOWFLAKE = SnowflakeUtil.generate(Date.now() - THRESHOLD);
        let presences = 0, guildMembers = 0, voiceStates = 0, emojis = 0, lastMessages = 0, users = 0;

        // Per-Guild sweeper
        for (const guild of this.client.guilds.cache.values()) {
            // Clear presences
            presences += guild.presences.cache.size;
            guild.presences.cache.clear();

            // Clear members that haven't sent a message in the last 30 minutes
            const { me } = guild;
            for (const [id, member] of guild.members.cache) {
                if (member === me) continue;
                if (member.voice.channelID) continue;
                if (member.lastMessageID && member.lastMessageID > OLD_SNOWFLAKE) continue;
                guildMembers++;
                voiceStates++;
                guild.voiceStates.cache.delete(id);
                guild.members.cache.delete(id);
            }

            // Clear emojis
            emojis += guild.emojis.cache.size;
            guild.emojis.cache.clear();
        }

        // Per-Channel sweeper
        for (const channel of this.client.channels.cache.values()) {
            if (!(channel as TextChannel).lastMessageID) continue;
            (channel as TextChannel).lastMessageID = null;
            lastMessages++;
        }

        // Per-User sweeper
        for (const user of this.client.users.cache.values()) {
            if (user.lastMessageID && user.lastMessageID > OLD_SNOWFLAKE) continue;
            this.client.users.cache.delete(user.id);
            users++;
        }

        // Emit a log
        console.log(`Sweeping stats:
${presences} [Presence]s
${guildMembers} [GuildMember]s
${voiceStates} [VoiceState]s
${users} [User]s
${emojis} [Emoji]s
${lastMessages} [Last Message]s`);
    }

    public init() {
        if (!this.client.options.useSweeper) this.disable();
    }
}