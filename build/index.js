"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const dotenv = require("dotenv");
const config = require("./config");
const Discord = require("discord.js");
const Command = require("./command");
var fs = require('fs');
dotenv.config();
const client = new Discord.Client();
const requirePrivileges = () => {
    return (message) => {
        const hasPerms = message.member.hasPermission(['MANAGE_GUILD']);
        return (hasPerms ? true : false);
    };
};
let botStorage = {};
const readConfig = () => {
    try {
        const data = fs.readFileSync('./storage.json', { encoding: 'utf8', flag: 'r' });
        return JSON.parse(data);
    }
    catch (_a) {
        return JSON.parse("{}");
    }
};
const saveConfig = () => {
    fs.writeFileSync("./storage.json", JSON.stringify(botStorage));
};
const getRoleAssignEmbed = (mappingList) => {
    const embed = {
        "title": "Role Assignment",
        "description": "Select your role by click on reaction under this message",
        "color": 16098851,
        "fields": [],
        "footer": {
            "text": "Bot powered by TakumiP"
        }
    };
    mappingList.forEach((item) => {
        embed.fields.push({
            "name": "<:" + item.emoteName + ":" + item.emoteId + ">    for    " + item.roleName + "",
            "value": "\u200b"
        });
    });
    return embed;
};
const getEndEmbed = () => {
    const embed = {
        "title": "Role assignment is over!",
        "description": "It's over 9000!, You can't assign the role anymore!",
        "color": 12118406,
        "fields": [],
        "footer": {
            "text": "Bot powered by TakumiP"
        }
    };
    return embed;
};
const checkOrCreateDefault = (guildId) => {
    if (!(guildId in botStorage)) {
        botStorage[guildId] = {
            trackMessageId: 0,
            trackMessageChannelId: 0,
            isRunning: false,
            roleMapping: []
        };
        saveConfig();
    }
};
const parseEmote = (emote) => {
    const cleanEmote = emote.replace('<:', '').replace('>', '').split(":");
    return {
        id: cleanEmote[1],
        name: cleanEmote[0]
    };
};
const parseRole = (role) => {
    return role.replace("<@&", "").replace(">", "");
};
client.once('ready', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    console.log('Bot is ready');
    botStorage = readConfig();
    console.log('Checking running campaign...');
    for (let key in botStorage) {
        if (botStorage[key].isRunning) {
            const channel = yield client.channels.fetch(botStorage[key].trackMessageChannelId);
            const message = yield channel.messages.fetch(botStorage[key].trackMessageId);
            const guild = client.guilds.cache.get(key);
            botStorage[key].roleMapping.forEach((item) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
                const reaction = message.reactions.cache.find(x => x.emoji.id == item.emoteId);
                if (reaction.partial) {
                    try {
                        yield reaction.fetch();
                    }
                    catch (error) {
                        return;
                    }
                }
                yield reaction.users.fetch();
                guild.members.cache.forEach((member) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
                    if (member.user.id != client.user.id) {
                        const isHaveGuildRole = member.roles.cache.find(x => x.id == item.roleId);
                        const isHaveReaction = reaction.users.cache.find(x => x.id == member.user.id);
                        if (isHaveGuildRole && !isHaveReaction) {
                            member.roles.remove(item.roleId);
                        }
                        else if (!isHaveGuildRole && isHaveReaction) {
                            member.roles.add(item.roleId);
                        }
                    }
                }));
            }));
        }
    }
    console.log('Fetch message successfully...');
    Command.createCommand('map')
        .help('Map Emote to Role')
        .manual('Map Emote to Role')
        .addArgument(Command.createArgument('string').setName('emote', 'Emote'))
        .addArgument(Command.createArgument('string').setName('role', 'Role'))
        .checkPermission(requirePrivileges())
        .exec((_3, args, _4, message, _9) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        if (!args.emote || !args.role) {
            return message.reply(`Usage : map <emote> <role>`);
        }
        const guildId = message.member.guild.id;
        checkOrCreateDefault(guildId);
        const emoteObj = parseEmote(args.emote);
        const roleStr = parseRole(args.role);
        if (botStorage[guildId].isRunning) {
            return message.reply(`You can't change role when role assign in-progress`);
        }
        const roleObj = message.member.guild.roles.cache.find(x => x.id == roleStr);
        if (!roleObj) {
            return message.reply(`Role doesn't exist!`);
        }
        const isExistEmote = botStorage[guildId]["roleMapping"].find(x => x.emoteId == emoteObj.id);
        if (isExistEmote) {
            return message.reply(`Emote <:${emoteObj.name}:${emoteObj.id}> already exists`);
        }
        const isExistRole = botStorage[guildId]["roleMapping"].find(x => x.roleId == roleObj.id);
        if (isExistRole) {
            return message.reply(`Role ${roleObj.name} already exists`);
        }
        botStorage[guildId]["roleMapping"].push({
            emoteId: emoteObj.id,
            emoteName: emoteObj.name,
            roleId: roleStr,
            roleName: roleObj.name,
        });
        saveConfig();
        return message.reply(`Added emote <:${emoteObj.name}:${emoteObj.id}> to role ${roleObj.name}`);
    }));
    Command.createCommand('unmap')
        .help('UnMap Emote')
        .manual('UnMap Emote')
        .addArgument(Command.createArgument('string').setName('emote', 'Emote'))
        .checkPermission(requirePrivileges())
        .exec((_3, args, _4, message, _9) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        if (!args.emote) {
            return message.reply(`Usage : unmap <emote>`);
        }
        const guildId = message.member.guild.id;
        checkOrCreateDefault(guildId);
        if (botStorage[guildId].isRunning) {
            return message.reply(`You can't change role when role assign in-progress`);
        }
        const emoteObj = parseEmote(args.emote);
        const isExistEmote = botStorage[guildId]["roleMapping"].find(x => x.emoteId == emoteObj.id);
        if (!isExistEmote) {
            return message.reply(`Emote <:${emoteObj.name}:${emoteObj.id}> not exist in map list`);
        }
        botStorage[guildId]["roleMapping"].splice(botStorage[guildId]["roleMapping"].indexOf(isExistEmote), 1);
        saveConfig();
        return message.reply(`Unmapped <:${emoteObj.name}:${emoteObj.id}> successfully`);
    }));
    Command.createCommand('clearmap')
        .help('Clean up all mapping')
        .manual('Clean up all mapping')
        .checkPermission(requirePrivileges())
        .exec((_3, _, _4, message, _9) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const guildId = message.member.guild.id;
        checkOrCreateDefault(guildId);
        if (botStorage[guildId].isRunning) {
            return message.reply(`You can't change role when role assign in-progress`);
        }
        botStorage[guildId]["roleMapping"] = [];
        saveConfig();
        return message.reply(`Clean up mapping list successfully`);
    }));
    Command.createCommand('listmap')
        .help('List all mapping')
        .manual('List all mapping')
        .checkPermission(requirePrivileges())
        .exec((_3, _, _4, message, _9) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const guildId = message.member.guild.id;
        checkOrCreateDefault(guildId);
        if (botStorage[guildId]["roleMapping"].length <= 0) {
            return message.reply(`Role mapping is empty.`);
        }
        const replyMsg = botStorage[guildId]["roleMapping"].map(obj => {
            return `<:${obj.emoteName}:${obj.emoteId}> -> ${obj.roleName}`;
        });
        return message.reply('Mapping roles list\n' + replyMsg.join("\n"));
    }));
    Command.createCommand('start')
        .help('Start role assignment')
        .manual('Start role assignment')
        .checkPermission(requirePrivileges())
        .exec((_3, _8, _4, message, _9) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const guildId = message.member.guild.id;
        checkOrCreateDefault(guildId);
        if (botStorage[guildId]["roleMapping"].length <= 0) {
            return message.reply(`Role mapping is empty, You cannot start role assignment.`);
        }
        if (botStorage[guildId].isRunning) {
            return message.reply(`Role assignment already started, You should stop it first.`);
        }
        botStorage[guildId].isRunning = true;
        saveConfig();
        return message.channel.send({ embed: getRoleAssignEmbed(botStorage[guildId]["roleMapping"]) })
            .then((message) => {
            botStorage[guildId].trackMessageId = message.id;
            botStorage[guildId].trackMessageChannelId = message.channel.id;
            saveConfig();
            botStorage[guildId]["roleMapping"].forEach((item) => {
                message.react(item.emoteId);
            });
        });
    }));
    Command.createCommand('stop')
        .help('Stop role assignment')
        .manual('Stop role assignment')
        .checkPermission(requirePrivileges())
        .exec((client, _8, _4, message, _9) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const guildId = message.member.guild.id;
        checkOrCreateDefault(guildId);
        if (!botStorage[guildId].isRunning) {
            return message.reply(`You can't stop something that didn't start yet.`);
        }
        const channel = yield client.channels.fetch(botStorage[guildId].trackMessageChannelId);
        const msg = yield channel.messages.fetch(botStorage[guildId].trackMessageId);
        msg.reactions.cache.forEach((reaction) => {
            reaction.users.cache.forEach((user) => {
                if (user.id != client.user.id) {
                    const ident = reaction.message.guild.members.cache.find(member => member.id == user.id);
                    const reactObject = botStorage[guildId].roleMapping.find(x => x.emoteId == reaction.emoji.id);
                    const hasRole = ident.roles.cache.find(role => (role.id == reactObject.roleId));
                    if (hasRole) {
                        ident.roles.remove(reactObject.roleId);
                        console.log(`Remove role ${reactObject.roleName} role for ${ident.displayName}`);
                    }
                }
            });
        });
        yield msg.delete();
        message.channel.send({ embed: getEndEmbed() });
        botStorage[guildId].isRunning = false;
        return saveConfig();
    }));
    Command.createCommand('sarenprefix')
        .help('Change command prefix')
        .manual('Display current command prefix when not provide New Prefix')
        .manual('Change the command prefix when provide New Prefix')
        .alias('sarenp')
        .addArgument(Command.createArgument('string').setName('prefix', 'New prefix'))
        .checkPermission(requirePrivileges())
        .exec((_3, args, _4, message, cmd) => {
        if (!args.prefix) {
            return message.reply(`Current command prefix is **${cmd.getCommandPrefix()}**`);
        }
        if (!cmd.setCommandPrefix(args.prefix)) {
            return message.reply(`Command prefix must have only 1 character.`);
        }
        else {
            return message.reply(`Your new command prefix is **${cmd.getCommandPrefix()}**`);
        }
    });
    Command.listen(client, './localdb.db');
    client.on('messageReactionAdd', (reaction, user) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        if (reaction.partial) {
            try {
                yield reaction.fetch();
            }
            catch (error) {
                return;
            }
        }
        const guildId = reaction.message.guild.id;
        checkOrCreateDefault(guildId);
        if (botStorage[guildId].isRunning) {
            if (reaction.message.channel.id == botStorage[guildId].trackMessageChannelId &&
                reaction.message.id == botStorage[guildId].trackMessageId && client.user.id != user.id) {
                const reactObject = botStorage[guildId].roleMapping.find(x => x.emoteId == reaction.emoji.id);
                if (reactObject) {
                    const ident = reaction.message.guild.members.cache.find(member => member.id == user.id);
                    const hasRole = ident.roles.cache.find(role => (role.id == reactObject.roleId));
                    if (!hasRole) {
                        ident.roles.add(reactObject.roleId);
                        console.log(`Grant role ${reactObject.roleName} role for ${ident.displayName}`);
                    }
                }
            }
        }
    }));
    client.on('messageReactionRemove', (reaction, user) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        if (reaction.partial) {
            try {
                yield reaction.fetch();
            }
            catch (error) {
                return;
            }
        }
        const guildId = reaction.message.guild.id;
        checkOrCreateDefault(guildId);
        if (botStorage[guildId].isRunning) {
            if (reaction.message.channel.id == botStorage[guildId].trackMessageChannelId &&
                reaction.message.id == botStorage[guildId].trackMessageId && client.user.id != user.id) {
                const reactObject = botStorage[guildId].roleMapping.find(x => x.emoteId == reaction.emoji.id);
                if (reactObject) {
                    const ident = reaction.message.guild.members.cache.find(member => member.id == user.id);
                    const hasRole = ident.roles.cache.find(role => (role.id == reactObject.roleId));
                    if (hasRole) {
                        ident.roles.remove(reactObject.roleId);
                        console.log(`Remove role ${reactObject.roleName} role for ${ident.displayName}`);
                    }
                }
            }
        }
    }));
}));
client.login(config.discordBot.token);
//# sourceMappingURL=index.js.map