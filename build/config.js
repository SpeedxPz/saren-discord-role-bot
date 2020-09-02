"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discordBot = void 0;
const dotenv = require("dotenv");
dotenv.config();
exports.discordBot = {
    token: process.env['discordbot.token'] || '',
    dbPath: process.env['discordbot.dbPath'] || '/data/guild.db',
    jsonPath: process.env['discordbot.jsonPath'] || '/data/storage.json'
};
//# sourceMappingURL=config.js.map