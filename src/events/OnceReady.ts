import { Event } from '../lib/structures/Event';
import { BasePool } from '../lib/structures/Pools/Base/BasePool';
import { MoonlightClient } from '../lib/Client';
import { Team } from 'discord.js';

export default class extends Event {
    constructor(client: MoonlightClient, pool: BasePool<string, Event>) {
        super(client, pool, {
            name: 'coreOnceReady',
            event: 'ready',
            once: true
        })
    }

    public async run() {
        if (this.client.options.readyMessage && typeof this.client.options.readyMessage == 'function') {
            console.log(this.client.options.readyMessage(this.client))
        }

        const applicationDetails = await this.client.fetchApplication();

        if ((applicationDetails.owner as Team).members) {
            this.client.owners.push(...(applicationDetails.owner as Team).members.map(member => member.user.id));
        } else {
            this.client.owners.push(applicationDetails.owner!.id);
        };

        // This will remove the duplicates
        this.client.owners = [...new Set(this.client.owners)];

        this.client.prefixes.push(`${this.client.user!.username}, `, `<@!${this.client.user!.id}>`);

        this.client.pools.forEach(pool => pool.init());
    }
}