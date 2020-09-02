"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discordBot = void 0;
const dotenv = require("dotenv");
dotenv.config();
exports.discordBot = {
    token: process.env['discordbot.token'] || ''
};
//# sourceMappingURL=config.js.map