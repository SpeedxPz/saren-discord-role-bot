"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listen = exports.CommandMessage = exports.CommandDispatch = exports.createArgument = exports.createCommand = exports.CommandUtility = void 0;
const tslib_1 = require("tslib");
const sqlite3 = require("sqlite3");
class ParseError extends Error {
    constructor(err, argument) {
        super(err);
        this.argument = argument;
    }
}
class TooManyArgumentsError extends Error {
    constructor(err, parseError) {
        super(err);
        this.parseError = parseError;
    }
}
class PermissionError extends Error {
    constructor(err) {
        super(err);
    }
}
class GuildConfig {
    constructor(guildConfig) {
        Object.assign(this, guildConfig);
    }
}
class GuildConfigStore {
    setClient(client) {
        this._client = client;
    }
    getConfig(guildId) {
        return this._client.getConfig(guildId);
    }
    getAll() {
        return this._client.getAll();
    }
    setConfig(guildConfig) {
        return this._client.setConfig(guildConfig);
    }
    delete(guildId) {
        return this._client.delete(guildId);
    }
    isConnected() {
        return this._client.isConnected();
    }
}
class SqliteStore {
    constructor(path) {
        this._store = new sqlite3.Database(path, () => {
            this._store.run('CREATE TABLE IF NOT EXISTS keyvaluestore (key TEXT, value TEXT, PRIMARY KEY("key"))');
        });
    }
    isConnected() {
        return true;
    }
    setValue(key, value) {
        return new Promise((resolve) => {
            var stmt = this._store.prepare('INSERT OR REPLACE INTO keyvaluestore (key, value) VALUES (?,?)');
            stmt.run(key, value);
            stmt.finalize();
            resolve(value);
        });
    }
    unsetValue(key) {
        return new Promise((resolve) => {
            var stmt = this._store.prepare('DELETE FROM keyvaluestore where key=?');
            stmt.run(key);
            stmt.finalize();
            resolve();
        });
    }
    getValue(key) {
        return new Promise((resolve, reject) => {
            this._store.all('SELECT key,value FROM keyvaluestore where key=?', [key], (err, rows) => {
                if (err)
                    return reject(err);
                if (rows.length > 0) {
                    return resolve(rows[0].value);
                }
                else {
                    return resolve();
                }
            });
        });
    }
    listValue() {
        return new Promise((resolve, reject) => {
            this._store.all('SELECT key,value FROM keyvaluestore', (err, rows) => {
                if (err)
                    return reject(err);
                const values = [];
                rows.forEach((item) => {
                    values.push(item);
                });
                resolve(values);
            });
        });
    }
}
class GuildConfigSqliteStore extends SqliteStore {
    constructor(path) {
        super(path);
    }
    getConfig(guildId) {
        return new Promise((resolve) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const result = yield this.getValue(guildId);
            if (typeof result !== 'undefined' && result !== '') {
                return resolve(JSON.parse(result));
            }
            return resolve(null);
        }));
    }
    setConfig(guildConfig) {
        return new Promise((resolve) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.setValue(guildConfig.id, JSON.stringify(guildConfig));
            const result = yield this.getConfig(guildConfig.id);
            return resolve(result);
        }));
    }
    getAll() {
        return new Promise((resolve) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const result = yield this.listValue();
            const guildConfigs = result.map((item) => {
                return JSON.parse(item);
            });
            resolve(guildConfigs);
        }));
    }
    delete(guildId) {
        return new Promise((resolve) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.unsetValue(guildId);
            resolve();
        }));
    }
}
const guildConfigStore = new GuildConfigStore();
class Argument {
    constructor() {
        this._optional = false;
        this._name = "_";
        this._display = "_";
        this._displayDefault = true;
        this._default = undefined;
    }
    validate(_1) {
        throw new Error("Not Implemented");
    }
    optional(fallback, displayDefault = true) {
        this._displayDefault = displayDefault;
        this._default = fallback;
        this._optional = true;
        return this;
    }
    getDefault() {
        return this._default;
    }
    hasDefault() {
        return this._default != undefined;
    }
    getManual() {
        if (this.isOptional()) {
            if (this._displayDefault && this.hasDefault()) {
                return `[${this._display}=${this.getDefault()}]`;
            }
            else {
                return `[${this._display}]`;
            }
        }
        else {
            return `<${this._display}>`;
        }
    }
    isOptional() {
        return this._optional;
    }
    setName(name, display = undefined) {
        this._display = display === undefined ? name : display;
        if (typeof name !== 'string')
            throw new Error('Argument of setName must be a string!');
        if (name.length < 1)
            throw new Error('Argument of setName must have at least 1 char long');
        if (!name.match(/^[a-z0-9_]+$/i))
            throw new Error("Argument of setName should contain only chars A-z, 0-9 and _");
        this._name = name;
        return this;
    }
    getName() {
        return this._name;
    }
    static createArgumentType() {
        return {
            string: new StringArgument(),
            number: new NumberArgument(),
            rest: new RestArgument()
        };
    }
}
class StringArgument extends Argument {
    constructor() {
        super();
        this._regex = null;
        this._maxlen = null;
        this._minlen = null;
        this._whitelist = null;
        this._uppercase = false;
        this._lowercase = false;
    }
    validate(args) {
        const argArray = args.split(" ");
        const str = argArray.shift();
        return this._validate(str || "", argArray.join(" "));
    }
    _validate(arg, ...rest) {
        if (this._uppercase)
            arg = arg.toUpperCase();
        if (this._lowercase)
            arg = arg.toLowerCase();
        if (this._minlen !== null && this._minlen > arg.length)
            throw new ParseError(`String length not greater or equal! Expected at least ${this._minlen}, but got ${arg.length}`, this);
        if (this._maxlen !== null && this._maxlen < arg.length)
            throw new ParseError(`String length not less or equal! Maximum ${this._maxlen} chars allowed, but got ${arg.length}`, this);
        if (this._whitelist !== null && !this._whitelist.includes(arg))
            throw new ParseError(`Invalid Input for ${arg}. Allowed words: ${this._whitelist.join(", ")}`, this);
        if (this._regex !== null && !this._regex.test(arg))
            throw new ParseError(`Regex missmatch, the input '${arg}' did not match the expression ${this._regex.toString()}`, this);
        return [arg, ...rest];
    }
    match(regex) {
        this._regex = regex;
        return this;
    }
    max(len) {
        this._maxlen = len;
        return this;
    }
    min(len) {
        this._minlen = len;
        return this;
    }
    forceUpperCase() {
        this._lowercase = false;
        this._uppercase = true;
        return this;
    }
    forceLowerCase() {
        this._lowercase = true;
        this._uppercase = false;
        return this;
    }
    whitelist(words) {
        if (!Array.isArray(this._whitelist))
            this._whitelist = [];
        this._whitelist.push(...words);
        return this;
    }
}
class RestArgument extends StringArgument {
    validate(args) {
        return super._validate(args, "");
    }
}
class NumberArgument extends Argument {
    constructor() {
        super();
        this._min = null;
        this._max = null;
        this._int = false;
        this._forcePositive = false;
        this._forceNegative = false;
    }
    validate(args) {
        const argArray = args.split(" ");
        const arg = argArray.shift() || "";
        const num = parseFloat(arg);
        if (!(/^-?\d+(\.\d+)?$/).test(arg) || isNaN(num))
            throw new ParseError(`"${arg}" is not a valid number`, this);
        if (this._min !== null && this._min > num)
            throw new ParseError(`Number not greater or equal! Expected at least ${this._min}, but got ${num}`, this);
        if (this._max !== null && this._max < num)
            throw new ParseError(`Number not less or equal! Expected at least ${this._max}, but got ${num}`, this);
        if (this._int && num % 1 !== 0)
            throw new ParseError(`Given Number is not an Integer! (${num})`, this);
        if (this._forcePositive && num <= 0)
            throw new ParseError(`Given Number is not Positive! (${num})`, this);
        if (this._forceNegative && num >= 0)
            throw new ParseError(`Given Number is not Negative! (${num})`, this);
        return [num, argArray.join(" ")];
    }
    min(min) {
        this._min = min;
        return this;
    }
    max(max) {
        this._max = max;
        return this;
    }
    integer() {
        this._int = true;
        return this;
    }
    positive() {
        this._forcePositive = true;
        this._forceNegative = false;
        return this;
    }
    negative() {
        this._forcePositive = false;
        this._forceNegative = true;
        return this;
    }
}
class CommandBase {
    constructor(cmd, collector) {
        this._collector = collector;
        this._execHandler = [];
        this._help = '';
        this._manual = [];
        this._name = cmd;
        this._alias = [];
        this._permissionHandler = [];
    }
    getUsage() {
        throw new Error("Not Implemented");
    }
    getUsageAlias() {
        throw new Error("Not Implemented");
    }
    hasPermission(_) {
        throw new Error("Not Implemented");
    }
    validate(_) {
        throw new Error("Not Implemented");
    }
    dispatch(_1, _2, _3) {
        throw new Error("Not Implemented");
    }
    alias(...alias) {
        alias = alias.map(a => a.toLowerCase());
        alias.forEach(a => Collector.isValidCommandName(a));
        this._alias.push(...alias.filter(a => this._collector.getAvailableCommands(a)));
        return this;
    }
    getCommandName() {
        return this._name;
    }
    getAlias() {
        return this._alias;
    }
    getCommandNames() {
        return [this.getCommandName(), ...this.getAlias()];
    }
    getHelp() {
        return this._help;
    }
    help(text) {
        this._help = text;
        return this;
    }
    hasHelp() {
        return this._help !== "";
    }
    getManual() {
        return this._manual.join("\r\n");
    }
    hasManual() {
        return this._manual.length > 0;
    }
    checkPermission(callback) {
        this._permissionHandler.push(callback);
        return this;
    }
    isAllowed(client) {
        return Promise.all(this._permissionHandler.map(cb => cb(client)))
            .then(res => res.every(r => r));
    }
    manual(text) {
        this._manual.push(text);
        return this;
    }
    clearManual() {
        this._manual = [];
        return this;
    }
    exec(callback) {
        this._execHandler.push(callback);
        return this;
    }
    _dispatchCommand(ev) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!(yield this.hasPermission(ev.message)))
                throw new PermissionError("no permission to execute this command");
            this._execHandler.forEach(handle => handle(ev.client, ev.arguments, ev.author, ev.message, ev.cmd));
        });
    }
}
class Command extends CommandBase {
    constructor(cmd, collector) {
        super(cmd, collector);
        this._arguments = [];
    }
    alias(...alias) {
        super.alias(...alias);
        return this;
    }
    help(text) {
        super.help(text);
        return this;
    }
    checkPermission(callback) {
        super.checkPermission(callback);
        return this;
    }
    manual(text) {
        super.manual(text);
        return this;
    }
    clearManual() {
        super.clearManual();
        return this;
    }
    exec(callback) {
        super.exec(callback);
        return this;
    }
    getUsage() {
        return `${this.getCommandName()} ${this.getArguments().map(arg => arg.getManual()).join(" ")}`;
    }
    getUsageAlias() {
        return this._alias.map(alias => {
            return `${alias} ${this.getArguments().map(arg => arg.getManual()).join(" ")}`;
        });
    }
    hasPermission(client) {
        return this.isAllowed(client);
    }
    addArgument(arg) {
        if (typeof arg === "function")
            arg = arg(Argument.createArgumentType());
        if (!(arg instanceof Argument))
            throw new Error(`Argument type not found`);
        this._arguments.push(arg);
        return this;
    }
    getArguments() {
        return this._arguments;
    }
    validate(args) {
        const { result, errors, remaining } = this.validateArgs(args);
        if (remaining.length > 0)
            throw new TooManyArgumentsError(`Too many argument!`, errors.shift());
        return result;
    }
    dispatch(args, ev, cmdUtil) {
        return this._dispatchCommand({
            client: ev.client,
            arguments: this.validate(args),
            author: ev.author,
            message: ev.message,
            cmd: cmdUtil,
        });
    }
    validateArgs(args) {
        args = args.trim();
        const result = {};
        const errors = [];
        this.getArguments().forEach(arg => {
            try {
                const [val, rest] = arg.validate(args);
                result[arg.getName()] = val;
                return args = rest.trim();
            }
            catch (e) {
                if (e instanceof ParseError && arg.isOptional()) {
                    result[arg.getName()] = arg.getDefault();
                    return errors.push(e);
                }
                throw e;
            }
        });
        return { result, remaining: args, errors };
    }
}
class Collector {
    constructor() {
        this._commands = [];
    }
    static isValidCommandName(name) {
        if (typeof name !== "string")
            throw new Error("Command name should be string!");
        if (name.length < 1)
            throw new Error(`Expect the length of command name more than 1`);
        if ((/\s/).test(name))
            throw new Error(`Command "${name}" should not contain spaces!`);
        return true;
    }
    static checkPermissions(commands, client) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const result = yield Promise.all(commands.map(cmd => cmd.hasPermission(client)));
            return commands.filter((_, i) => result[i]);
        });
    }
    registerCommand(name) {
        name = name.toLowerCase();
        if (!Collector.isValidCommandName(name))
            throw new Error("Can not create a command with length of 0");
        const cmd = new Command(name, this);
        this._commands.push(cmd);
        return cmd;
    }
    getAvailableCommands(name) {
        name = name.toLowerCase();
        return this._commands
            .filter(cmd => cmd.getCommandNames().includes(name));
    }
    getAvailableCommandsByPermission(client) {
        return Collector.checkPermissions(this._commands, client);
    }
    isPossibleCommand(text) {
        return this._commands.some(cmd => cmd.getCommandName() === text.split(" ")[0]);
    }
    isCommandCanSave(cmdName) {
        cmdName = cmdName.toLowerCase();
        Collector.isValidCommandName(cmdName);
        if (this.getAvailableCommands(cmdName).length > 0)
            return false;
        return true;
    }
}
const collector = new Collector();
class Logger {
    static writeLog(message) {
        console.log(message);
    }
}
class CommandUtility {
    constructor(guildConfig) {
        this._guildConfig = guildConfig;
    }
    getCommandPrefix() {
        return this._guildConfig.commandPrefix;
    }
    setCommandPrefix(prefix) {
        if (!prefix || prefix.length != 1)
            return false;
        this._guildConfig.commandPrefix = prefix;
        guildConfigStore.setConfig(this._guildConfig);
        return true;
    }
    isPossibleCommand(text) {
        if (text.startsWith(this._guildConfig.commandPrefix))
            return true;
        return collector.isPossibleCommand(text);
    }
    getAvailableCommandsWithPrefix(name) {
        if (!name.startsWith(this._guildConfig.commandPrefix))
            return [];
        const cmdName = name.slice(1);
        return collector.getAvailableCommands(cmdName);
    }
}
exports.CommandUtility = CommandUtility;
const messageHandler = (ev) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    if (ev.mode !== 2)
        return Logger.writeLog('Chat coming from another source than channel, Just ignored');
    if (!ev.author)
        return Logger.writeLog('Unknow author, Just ignored');
    if (ev.author.bot)
        return;
    if (!ev.message.guild && !ev.message.guild.id)
        return;
    let guildConfig = yield guildConfigStore.getConfig(ev.message.guild.id);
    if (!guildConfig) {
        console.log("Guild config not found create it!");
        guildConfig = new GuildConfig({
            id: ev.message.guild.id,
            commandPrefix: '!'
        });
        yield guildConfigStore.setConfig(guildConfig);
    }
    const cmdUtil = new CommandUtility(guildConfig);
    if (!cmdUtil.isPossibleCommand(ev.text))
        return;
    const match = ev.text.match(new RegExp(`^(?<command>\\S*)\\s*(?<args>.*)\\s*$`, "s"));
    if (!match || !match.groups)
        throw new Error(`command regex missmatch for '${ev.text}'`);
    const { command, args } = match.groups;
    const commands = cmdUtil.getAvailableCommandsWithPrefix(command);
    if (commands.length === 0)
        return;
    commands.forEach((cmd) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const startTime = Date.now();
        try {
            Logger.writeLog(`${ev.author.username}@${ev.message.guild.name} issue command ${cmd.getCommandName()}`);
            yield cmd.dispatch(args, ev, cmdUtil);
            Logger.writeLog(`Command "${cmd.getCommandName()}" finnished successfully after ${Date.now() - startTime}ms`);
        }
        catch (e) {
            Logger.writeLog(`Command "${cmd.getCommandName()}" failed after ${Date.now() - startTime}ms`);
            if (e instanceof PermissionError) {
                Logger.writeLog(`${ev.author.username}@${ev.message.guild.name} missing permission for ${cmd.getCommandName()}`);
                ev.message.reply(`You don't have permission to use this command\n` +
                    `For available command type **${cmdUtil.getCommandPrefix()}help**`);
            }
            else if (e instanceof ParseError) {
                ev.message.reply(`Invalid command usage!\n` +
                    `For usage detail type **${cmdUtil.getCommandPrefix()}help ${cmd.getCommandName()}**`);
            }
            else if (e instanceof TooManyArgumentsError) {
                ev.message.reply(`Invalid command usage!\n` +
                    `For usage detail type **${cmdUtil.getCommandPrefix()}help ${cmd.getCommandName()}**`);
            }
            else {
                ev.message.reply(`Unexpected error, Bot developer doing bad at thier job and should feel bad\nYou should tell him to fix this`);
                const match = e.stack.match(new RegExp("^(?<type>\\w+): *(?<msg>.+?)\\s+(at .+?\\(((?<script>\\w+):(?<line>\\d+):(?<row>\\d+))\\))", "s"));
                if (match) {
                    const { type, msg, script, line, row } = match.groups;
                    Logger.writeLog(`Unhandled Script Error in Script "${script.endsWith(".js") ? script : `${script}.js`}" on line ${line} at index ${row}`);
                    Logger.writeLog(`${type}: ${msg}`);
                    Logger.writeLog(e.stack);
                }
                else {
                    Logger.writeLog("Unknow error!\n");
                    Logger.writeLog(e.stack);
                }
            }
        }
    }));
});
exports.createCommand = (cmdName) => {
    if (!collector.isCommandCanSave(cmdName)) {
        throw new Error("This command already exist!");
    }
    return collector.registerCommand(cmdName);
};
exports.createArgument = (type) => {
    const arg = Argument.createArgumentType()[type];
    if (!(arg instanceof Argument))
        throw new Error(`Argument type not found, Available : ${Object.keys(Argument.createArgumentType()).join(", ")}`);
    return arg;
};
class CommandDispatch {
    constructor(commandDispatch) {
        Object.assign(this, commandDispatch);
    }
}
exports.CommandDispatch = CommandDispatch;
class CommandMessage {
    constructor(commandMessage) {
        Object.assign(this, commandMessage);
    }
}
exports.CommandMessage = CommandMessage;
exports.createCommand('help')
    .help(`Use 'help <command name>' to get more details`)
    .manual(`Display list of usable commands`)
    .manual(`You can specific command name to view how to use (eg !help commandname)`)
    .addArgument(exports.createArgument("string").setName("cmdName").optional(''))
    .exec((client, args, _4, message, cmdUtil) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    if (!args.cmdName || args.cmdName == '') {
        const fixLen = (str, len) => str + Array(len - str.length).fill('\xa0').join("");
        let length = 0;
        const cmds = (yield collector.getAvailableCommandsByPermission(message))
            .filter(cmd => cmd.hasHelp());
        message.reply(`**${cmds.length.toString()}** Commands available for you`);
        const commands = [];
        yield Promise.all(cmds.map((cmd) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            if (`${cmdUtil.getCommandPrefix()}${cmd.getCommandName()}`.length > length)
                length = `${cmdUtil.getCommandPrefix()}${cmd.getCommandName()}`.length;
            commands.push([`${cmdUtil.getCommandPrefix()}${cmd.getCommandName()}`, cmd.getHelp()]);
        })));
        const init = [[]];
        commands.map(([cmd, help]) => '**' + fixLen(cmd, length) + '**' + '\xa0``' + help + '``')
            .reduce((acc, curr) => {
            if (acc[acc.length - 1].length + acc.join("\n").length + 6 >= 2000) {
                acc[acc.length] = [curr];
            }
            else {
                acc[acc.length - 1].push(curr);
            }
            return acc;
        }, init)
            .forEach(lines => {
            const messageEmbed = {
                "title": `Command List`,
                "description": "\n" + lines.join("\n"),
                "color": 4886754,
                "thumbnail": {
                    "url": client.user.avatarURL()
                },
                "fields": []
            };
            message.channel.send({ embed: messageEmbed });
        });
    }
    else {
        const getManual = cmd => {
            if (cmd.hasManual())
                return cmd.getManual();
            if (cmd.hasHelp())
                return cmd.getHelp();
            return "No manual available";
        };
        const cmds = yield Collector.checkPermissions(collector.getAvailableCommands(args.cmdName), message);
        if (cmds.length === 0)
            return message.reply(`Command **${args.cmdName}** not found`);
        cmds.forEach((cmd) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            let usageAliasText = '';
            if (cmd.getUsageAlias().length > 0) {
                const aliasArray = cmd.getUsageAlias().map(alias => {
                    return `${cmdUtil.getCommandPrefix()}${alias}`;
                });
                usageAliasText = "```\n**Short Version:**\n```" + aliasArray.join('\n');
            }
            const helpEmbed = {
                "title": `How to use **${cmdUtil.getCommandPrefix()}${cmd.getCommandName()}**`,
                "description": "\n**Usage:**\n```" + cmdUtil.getCommandPrefix() + cmd.getUsage() + usageAliasText + " " + "```\n**Explain:**\n```" + getManual(cmd) + "```",
                "color": 4886754,
                "thumbnail": {
                    "url": client.user.avatarURL()
                },
                "fields": []
            };
            message.channel.send({ embed: helpEmbed });
        }));
    }
    return null;
}));
exports.listen = (client, dbPath) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    guildConfigStore.setClient(new GuildConfigSqliteStore(dbPath));
    client.on('message', (ev) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        messageHandler({
            client: client,
            author: ev.author,
            channel: ev.channel,
            mode: ev.guild ? 2 : 1,
            text: ev.content,
            message: ev
        });
    }));
});
//# sourceMappingURL=command.js.map