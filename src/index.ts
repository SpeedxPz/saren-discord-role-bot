import * as dotenv from 'dotenv';
import * as config from './config';
import * as Discord from 'discord.js';
import * as Command from './command';
var fs = require('fs');


dotenv.config();

const client = new Discord.Client();

const requirePrivileges = () => {
    return (message: Discord.Message) => {
        const hasPerms = message.member.hasPermission(['MANAGE_GUILD']);
        return (hasPerms?true:false);
    };
}

let botStorage = {};

const readConfig = () : any => {
    try {
        const data = fs.readFileSync('./storage.json', {encoding:'utf8', flag:'r'});
        return JSON.parse(data);
    } catch {
        return JSON.parse("{}");
    }
}

const saveConfig = () : any => {
	fs.writeFileSync("./storage.json", JSON.stringify(botStorage));
}

/*let voteInfo = [];

let isVoteStart = 0;
let messageInstance : Discord.Message;*/


/*const EmojiVotes = [
    {
        id: "718001335823499287",
        name: "yuiwow",
        explain : "Drama-CD ของ ทวิงเคิลวิช × ไวซ์ฟูลเกล (อีเว้นปีใหม่ + โอเอโดะ)"
    },
    {
        id: "718001336158912527",
        name: "yuiconfuse",
        explain : "Drama-CD ของ นากาโยชิบุ x ลิตเติ้ล ลิลิคอล (อีเว้นฮาโลวีน + ยูนิจังอายุ 8 ขวบ)"
    },
    {
        id: "718001336385273940",
        name: "yaaay",
        explain : "Drama-CD ของ โรงเรียนลูเซนท์ + คาออน (อีเว้นว่ายน้ำ 2019)"
    },
    {
        id: "718001335961780297",
        name: "uzukigan",
        explain : "Drama-CD ของ คาออน only"
    },
    {
        id: "718001335731093547",
        name: "tyupakyabura",
        explain : "โหวตให้ Drama-CD ของ คัลมิน่า"
    },

];*/

/*const EmojiVotes = [
    {
        id: "734345707477139496",
        name: "YuiConfuse",
        explain : "Drama-CD ของ ทวิงเคิลวิช × ไวซ์ฟูลเกล (อีเว้นปีใหม่ + โอเอโดะ)"
    },
    {
        id: "734345206601744514",
        name: "YuniOnegai",
        explain : "Drama-CD ของ นากาโยชิบุ x ลิตเติ้ล ลิลิคอล (อีเว้นฮาโลวีน + ยูนิจังอายุ 8 ขวบ)"
    },
    {
        id: "734345205423144971",
        name: "SuzunaWink",
        explain : "Drama-CD ของ โรงเรียนลูเซนท์ + คาออน (อีเว้นว่ายน้ำ 2019)"
    },
    {
        id: "734345728972816414",
        name: "MakotoFloat",
        explain : "Drama-CD ของ คาออน only"
    },
    {
        id: "734345205045657680",
        name: "NozomiShock",
        explain : "โหวตให้ Drama-CD ของ คัลมิน่า"
    },

];*/

/*const getVoteEmbed = () => {
    const embed = {
        "title": "Quick time event : มานั่งเม้า Drama-CD กัน",
        "description": "Let's do the vote!",
        "color": 16098851,
        "fields": []
    };


    EmojiVotes.forEach((item) => {
        embed.fields.push({
            "name": "<:" + item.name + ":" + item.id + "> [Vote Count: " + voteInfo.filter( emote => emote.name == item.name).length + " ]",
            "value": "โหวตให้ " + item.explain + "\n\n"
        });
    });

    return embed;
};*/

/*const getVoteResult = (voteResults) => {
    const embed = {
        "title": "การโหวตจบลงแล้วจ้า!",
        "description": "Quick time event : มานั่งเม้า Drama-CD กัน\n\n**ตัวเลือกที่ชนะการโหวตคือ**",
        "color": 12118406,
        "fields": []
    };

    const winner = voteResults.filter(item => item.voteCount == voteResults[0].voteCount);


    winner.forEach(item => {
        embed.fields.push({
            "name": item.explain,
            "value": item.voteCount + " โหวต"
        });
    });

    
    

    return embed;
};*/


const getRoleAssignEmbed = (mappingList : any) => {
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

const checkOrCreateDefault = (guildId : string) => {
    if(!(guildId in botStorage)){
        botStorage[guildId] = {
            trackMessageId : 0,
            trackMessageChannelId: 0,
            isRunning : false,
            roleMapping : []
        };
        saveConfig();
    }
}

const parseEmote = (emote : string) : any => {
    const cleanEmote = emote.replace('<:','').replace('>','').split(":");
    return {
        id: cleanEmote[1],
        name: cleanEmote[0]
    };
}

const parseRole = (role : string) : string => {
    return role.replace("<@&", "").replace(">","");
}

client.once('ready',async () => {
    console.log('Bot is ready');

    botStorage = readConfig();

    console.log('Checking running campaign...');

    for(let key in botStorage){
        if(botStorage[key].isRunning){
            const channel: Discord.TextChannel = await client.channels.fetch(botStorage[key].trackMessageChannelId) as Discord.TextChannel;
            const message: Discord.Message = await channel.messages.fetch(botStorage[key].trackMessageId);

            const guild = client.guilds.cache.get(key);
            botStorage[key].roleMapping.forEach( async (item : any) => {
                const reaction = message.reactions.cache.find( x => x.emoji.id == item.emoteId);

                if (reaction.partial) {
                    try {
                        await reaction.fetch();
                    } catch (error) {
                        return;
                    }
                }
                await reaction.users.fetch();

                guild.members.cache.forEach( async (member : Discord.GuildMember) => {

                    if(member.user.id != client.user.id){
                        const isHaveGuildRole = member.roles.cache.find( x => x.id == item.roleId);
                        const isHaveReaction = reaction.users.cache.find( x => x.id == member.user.id);

                        if(isHaveGuildRole && !isHaveReaction){
                            member.roles.remove(item.roleId);
                        } else if(!isHaveGuildRole && isHaveReaction){
                            member.roles.add(item.roleId);
                        }
                    }

                });
            });

            
        }
    }

    console.log('Fetch message successfully...');


    
    Command.createCommand('map')
        .help('Map Emote to Role')
        .manual('Map Emote to Role')
        .addArgument(Command.createArgument('string').setName('emote', 'Emote'))
        .addArgument(Command.createArgument('string').setName('role', 'Role'))
        .checkPermission(requirePrivileges())
        .exec(async (_3: Discord.Client, args: any, _4: Discord.User, message: Discord.Message, _9: Command.CommandUtility) => {
            
            if(!args.emote || !args.role){
                return message.reply(`Usage : map <emote> <role>`);
            }
            const guildId = message.member.guild.id;
            
			checkOrCreateDefault(guildId);
            const emoteObj = parseEmote(args.emote);
            const roleStr = parseRole(args.role);

            
            if(botStorage[guildId].isRunning)
            {
                return message.reply(`You can't change role when role assign in-progress`);
            }

            const roleObj = message.member.guild.roles.cache.find( x => x.id == roleStr);
            if(!roleObj){
                return message.reply(`Role doesn't exist!`);
            }

            const isExistEmote = botStorage[guildId]["roleMapping"].find( x => x.emoteId == emoteObj.id);
            if(isExistEmote){
                return message.reply(`Emote <:${emoteObj.name}:${emoteObj.id}> already exists`);
            }

            const isExistRole = botStorage[guildId]["roleMapping"].find( x => x.roleId == roleObj.id);
            if(isExistRole){
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
        });

    Command.createCommand('unmap')
        .help('UnMap Emote')
        .manual('UnMap Emote')
        .addArgument(Command.createArgument('string').setName('emote', 'Emote'))
        .checkPermission(requirePrivileges())
        .exec(async (_3: Discord.Client, args: any, _4: Discord.User, message: Discord.Message, _9: Command.CommandUtility) => {
            
            if(!args.emote){
                return message.reply(`Usage : unmap <emote>`);
            }
            const guildId = message.member.guild.id;
            
            checkOrCreateDefault(guildId);
            
            if(botStorage[guildId].isRunning)
            {
                return message.reply(`You can't change role when role assign in-progress`);
            }
            const emoteObj = parseEmote(args.emote);
            

            const isExistEmote = botStorage[guildId]["roleMapping"].find( x => x.emoteId == emoteObj.id);
            if(!isExistEmote){
                return message.reply(`Emote <:${emoteObj.name}:${emoteObj.id}> not exist in map list`);
            }

            botStorage[guildId]["roleMapping"].splice(botStorage[guildId]["roleMapping"].indexOf(isExistEmote), 1);
            
            saveConfig();
            return message.reply(`Unmapped <:${emoteObj.name}:${emoteObj.id}> successfully`);
        });
    
    Command.createCommand('clearmap')
        .help('Clean up all mapping')
        .manual('Clean up all mapping')
        .checkPermission(requirePrivileges())
        .exec(async (_3: Discord.Client, _: any, _4: Discord.User, message: Discord.Message, _9: Command.CommandUtility) => {
            
            const guildId = message.member.guild.id;
            
            checkOrCreateDefault(guildId);
            
            if(botStorage[guildId].isRunning)
            {
                return message.reply(`You can't change role when role assign in-progress`);
            }
            

            botStorage[guildId]["roleMapping"] = [];
            
            saveConfig();
            return message.reply(`Clean up mapping list successfully`);
        });
    
    Command.createCommand('listmap')
        .help('List all mapping')
        .manual('List all mapping')
        .checkPermission(requirePrivileges())
        .exec(async (_3: Discord.Client, _: any, _4: Discord.User, message: Discord.Message, _9: Command.CommandUtility) => {
            

            const guildId = message.member.guild.id;
            
            checkOrCreateDefault(guildId);
            
            
            if(botStorage[guildId]["roleMapping"].length <= 0){
                return message.reply(`Role mapping is empty.`);
            }

            const replyMsg = botStorage[guildId]["roleMapping"].map(obj => {
                return `<:${obj.emoteName}:${obj.emoteId}> -> ${obj.roleName}`;
            })

            return message.reply('Mapping roles list\n' + replyMsg.join("\n"));
    });

    Command.createCommand('start')
        .help('Start role assignment')
        .manual('Start role assignment')
        .checkPermission(requirePrivileges())
        .exec(async (_3: Discord.Client, _8: any, _4: Discord.User, message: Discord.Message, _9: Command.CommandUtility) => {
            const guildId = message.member.guild.id;
            checkOrCreateDefault(guildId);

            if(botStorage[guildId]["roleMapping"].length <= 0){
                return message.reply(`Role mapping is empty, You cannot start role assignment.`);
            }

            if(botStorage[guildId].isRunning)
            {
                return message.reply(`Role assignment already started, You should stop it first.`);
            }

            botStorage[guildId].isRunning = true;
            saveConfig();
            return message.channel.send({ embed: getRoleAssignEmbed(botStorage[guildId]["roleMapping"])})
                .then((message : Discord.Message) => {
                    botStorage[guildId].trackMessageId = message.id;
                    botStorage[guildId].trackMessageChannelId = message.channel.id;
                    saveConfig();
                    botStorage[guildId]["roleMapping"].forEach((item) => {
                        message.react(item.emoteId);
                    });
                });
            

        });

    Command.createCommand('stop')
        .help('Stop role assignment')
        .manual('Stop role assignment')
        .checkPermission(requirePrivileges())
        .exec(async (client: Discord.Client, _8: any, _4: Discord.User, message: Discord.Message, _9: Command.CommandUtility) => {

            const guildId = message.member.guild.id;
            checkOrCreateDefault(guildId);

            if(!botStorage[guildId].isRunning)
            {
                return message.reply(`You can't stop something that didn't start yet.`);
            }

            const channel: Discord.TextChannel = await client.channels.fetch(botStorage[guildId].trackMessageChannelId) as Discord.TextChannel;
            const msg: Discord.Message = await channel.messages.fetch(botStorage[guildId].trackMessageId);

            msg.reactions.cache.forEach( (reaction : Discord.MessageReaction) => {
                reaction.users.cache.forEach( (user : Discord.User) => {
                    if(user.id != client.user.id){
                        const ident = reaction.message.guild.members.cache.find(member => member.id == user.id);
                        const reactObject = botStorage[guildId].roleMapping.find( x => x.emoteId == reaction.emoji.id);
                        const hasRole = ident.roles.cache.find( role => (role.id == reactObject.roleId));
                        if(hasRole){
                            ident.roles.remove(reactObject.roleId);
                            console.log(`Remove role ${reactObject.roleName} role for ${ident.displayName}`);
                        }
                    }
                });
                
            });
            await msg.delete();
            message.channel.send({ embed: getEndEmbed()});
            botStorage[guildId].isRunning = false;
            return saveConfig();
        });
    
    
    Command.createCommand('sarenprefix')
        .help('Change command prefix')
        .manual('Display current command prefix when not provide New Prefix')
        .manual('Change the command prefix when provide New Prefix')
        .alias('sarenp')
        .addArgument(Command.createArgument('string').setName('prefix', 'New prefix'))
        .checkPermission(requirePrivileges())
        .exec((_3: Discord.Client, args: any, _4: Discord.User, message: Discord.Message, cmd: Command.CommandUtility) => {
            
            if(!args.prefix){
                return message.reply(`Current command prefix is **${cmd.getCommandPrefix()}**`);
            }
            if(!cmd.setCommandPrefix(args.prefix)){
                return message.reply(`Command prefix must have only 1 character.`);
            } else {
                return message.reply(`Your new command prefix is **${cmd.getCommandPrefix()}**`);
            }
        });
    Command.listen(client, './localdb.db');

    client.on('messageReactionAdd', async ( reaction : Discord.MessageReaction, user : Discord.User) => {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                return;
            }
        }

        const guildId = reaction.message.guild.id;
        checkOrCreateDefault(guildId);
        if(botStorage[guildId].isRunning){
            if(reaction.message.channel.id == botStorage[guildId].trackMessageChannelId &&
                reaction.message.id == botStorage[guildId].trackMessageId && client.user.id != user.id
            ) {
                const reactObject = botStorage[guildId].roleMapping.find( x => x.emoteId == reaction.emoji.id);
                if(reactObject){
                    const ident = reaction.message.guild.members.cache.find(member => member.id == user.id);
                    const hasRole = ident.roles.cache.find( role => (role.id == reactObject.roleId));
                    if(!hasRole){
                        ident.roles.add(reactObject.roleId);
                        console.log(`Grant role ${reactObject.roleName} role for ${ident.displayName}`);
                    }
                }
            }
        }
    });

    client.on('messageReactionRemove', async ( reaction : Discord.MessageReaction, user : Discord.User) => {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                return;
            }
        }

        const guildId = reaction.message.guild.id;
        checkOrCreateDefault(guildId);
        if(botStorage[guildId].isRunning){
            if(reaction.message.channel.id == botStorage[guildId].trackMessageChannelId &&
                reaction.message.id == botStorage[guildId].trackMessageId && client.user.id != user.id
            ) {
                const reactObject = botStorage[guildId].roleMapping.find( x => x.emoteId == reaction.emoji.id);
                if(reactObject){
                    const ident = reaction.message.guild.members.cache.find(member => member.id == user.id);
                    const hasRole = ident.roles.cache.find( role => (role.id == reactObject.roleId));
                    if(hasRole){
                        ident.roles.remove(reactObject.roleId);
                        console.log(`Remove role ${reactObject.roleName} role for ${ident.displayName}`);
                    }
                }
            }
        }
    });


})



client.login(config.discordBot.token);