const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skips to the next track if there is one.'),
	async execute(emitter, interaction) {

		await interaction.deferReply();

        await emitter.emit('skip', interaction);

	},
	passClient: false,
    passEmitter: true,
	type: 1,
};