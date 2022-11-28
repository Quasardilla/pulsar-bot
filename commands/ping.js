const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('A cute little tutorial command that replies with Pong!'),
	async execute(interaction) {

		if(await interaction.user.id == '741343008145801307'){
			await interaction.reply(`It took me ${Date.now() - interaction.createdTimestamp} ms to pull up. Look outside.`);
		} 
		else {
			await interaction.reply(`Pong! (${Date.now() - interaction.createdTimestamp} ms.)`);
		}
	},
	passClient: false,
    passEmitter: false,
	type: 2,
};