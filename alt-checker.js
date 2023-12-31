import DiscordBasePlugin from './discord-base-plugin.js';
import DBLog from './db-log.js';
import Sequelize, { NOW, Op, QueryTypes } from 'sequelize';

const delay = (ms) => new Promise((res, rej) => setTimeout(res));

const RETURN_TYPE = {
    NO_MATCH: 0,
    PLAYER_NOT_FOUND: 1
}
export default class AltChecker extends DiscordBasePlugin {
    static get description() {
        return '';
    }

    static get defaultEnabled() {
        return true;
    }

    static get optionsSpecification() {
        return {
            ...DiscordBasePlugin.optionsSpecification,
            commandPrefix: {
                required: false,
                description: 'Command name to get message.',
                default: '!altcheck'
            },
            channelID: {
                required: true,
                description: 'The ID of the channel to log data.',
                default: '',
                example: '667741905228136459'
            },
            kickIfAltDetected: {
                required: false,
                description: 'Will kick a player if an ALT has been detected on his IP.',
                default: true
            },
            kickReason: {
                required: false,
                description: 'Reason of the kick due to an ALT account being detected',
                default: 'ALT detected. Protection kick',
            },
        };
    }

    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.onMessage = this.onMessage.bind(this);
        this.onDiscordMessage = this.onDiscordMessage.bind(this);
        this.doAltCheck = this.doAltCheck.bind(this);
        this.onChatMessage = this.onChatMessage.bind(this);
        this.onPlayerConnected = this.onPlayerConnected.bind(this);

        this.DBLogPlugin;

        this.warn = (steamid, msg) => { this.server.rcon.warn(steamid, msg); };
        this.kick = (eosID, reason) => { this.server.rcon.execute(`AdminKick "${eosID}" ${reason}`); };
    }

    async mount() {
        this.DBLogPlugin = this.server.plugins.find(p => p instanceof DBLog);
        if (!this.DBLogPlugin) return;

        this.options.discordClient.on('message', this.onDiscordMessage);
        this.server.on('CHAT_MESSAGE', this.onChatMessage);
        this.server.on('PLAYER_CONNECTED', this.onPlayerConnected);
    }

    async unmount() {
    }

    async onDiscordMessage(message) {
        const res = await this.onMessage(message.content);

        if (res === RETURN_TYPE.NO_MATCH) return;

        const embed = this.generateDiscordEmbed(res);
        message.channel.send({ embed: embed });
    }

    async onChatMessage(message) {
        if (message.chat != 'ChatAdmin') return;

        const res = await this.onMessage(message.message);

        if (res == RETURN_TYPE.NO_MATCH) return;

        if (!res || res == RETURN_TYPE.PLAYER_NOT_FOUND || res.length == 0) {
            this.warn(message.eosID, `Unable to find player`);
            return;
        }

        let warningMessage = ""

        if (res.length > 1) {
            warningMessage += `Alts for IP: ${res[ 0 ].lastIP}\n`

            for (let altK in res) {
                const alt = res[ altK ];

                warningMessage += `\n${+altK + 1}. ${alt.lastName}`
            }
        } else {
            warningMessage += `No Alts found!`
        }

        this.warn(message.eosID, warningMessage);
    }

    async onMessage(message) {
        const messageContent = message
        const regex = new RegExp(`^${this.options.commandPrefix} (?<steamID>\\d{17})?(?<eosID>[\\w\\d]{32})?(?<lastIP>[\\d\\.]+)?$`, 'i');
        const matched = messageContent.match(regex)

        if (!matched) return RETURN_TYPE.NO_MATCH;

        const res = await this.doAltCheck(matched.groups)

        return res;
    }

    async onPlayerConnected(info) {
        await delay(3000);

        const res = await this.doAltCheck({ lastIP: info.ip })

        if (!res) return;

        if (res.length <= 1 || res == RETURN_TYPE.PLAYER_NOT_FOUND) return;

        const embed = this.generateDiscordEmbed(res);
        embed.title = `Alts found for connected player: ${info.player.name}`
        embed.description = this.getFormattedUrlsPart(info.player.steamID, info.eosID) + "\n​";

        if (this.options.kickIfAltDetected)
            this.kick(info.eosID, this.options.kickReason)

        await this.sendDiscordMessage({ embed: embed });
    }

    generateDiscordEmbed(res) {
        let embed

        if (!res || res == RETURN_TYPE.PLAYER_NOT_FOUND || res.length == 0) {
            embed = {
                title: `Unable to find player`,
                description: `Player hasn't been found in the database!`,
                color: 'ff9900',
            }
        } else if (res.length > 1) {
            embed = {
                title: `Alts for IP: ${res[ 0 ].lastIP}`,
                color: 'FF0000',
                fields: []
            }

            for (let altK in res) {
                const alt = res[ altK ];

                embed.fields.push({
                    name: `${+altK + 1}. ${alt.lastName}`,
                    value: `${this.getFormattedUrlsPart(alt.steamID, alt.eosID)}\n**SteamID: **\`${alt.steamID}\`\n**EOS ID: **\`${alt.eosID}\`\n​`
                })
            }
        } else {
            this.verbose(1, 'No alts found', res)
            embed = {
                title: `No Alts found`,
                description: `Player is clean!`,
                color: '00FF00',
            }
        }

        return embed;
    }

    async doAltCheck(matchGroups) {
        let condition;
        let IP;

        for (let group in matchGroups)
            if (matchGroups[ group ]) {
                condition = { [ group ]: matchGroups[ group ] }
                if (group == 'lastIP')
                    IP = matchGroups[ group ];
                break;
            }

        if (!IP) {
            const ipLookup = await this.DBLogPlugin.models.Player.findOne({
                where: condition
            })
            if (!ipLookup) return RETURN_TYPE.PLAYER_NOT_FOUND;

            IP = ipLookup.lastIP;
        }

        const res = await this.DBLogPlugin.models.Player.findAll({
            where: {
                lastIP: IP
            }
        })

        return res;
    }

    getFormattedUrlsPart(steamID, eosID) {
        return `[Steam](https://steamcommunity.com/profiles/${steamID}) | [BattleMetrics](${this.getBattlemetricsRconUrl(eosID)}) | [CBL](https://communitybanlist.com/search/${steamID})`
    }

    getBattlemetricsRconUrl(eosID) {
        return `https://www.battlemetrics.com/rcon/players?filter%5Bsearch%5D=${eosID}&filter%5Bservers%5D=false&filter%5BplayerFlags%5D=&sort=-lastSeen&showServers=true&method=quick&redirect=1`
    }
}