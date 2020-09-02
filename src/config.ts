import * as dotenv from 'dotenv';

dotenv.config();

export const discordBot = {
    token: process.env['discordbot.token'] || '',
	dbPath: process.env['discordbot.dbPath'] || '/data/guild.db',
	jsonPath: process.env['discordbot.jsonPath'] || '/data/storage.json'
}