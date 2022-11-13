const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('A cute little tutorial command that replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};