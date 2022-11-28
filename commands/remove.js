const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Removes a track from the queue.')
        .addIntegerOption((option) => option.setName('track').setDescription('Any track available in the queue').setRequired(true)),
	async execute(emitter, interaction) {
        const input = interaction.options.getInteger('track');

		await interaction.deferReply();

        await emitter.emit('remove', input, interaction);

	},
	passClient: false,
    passEmitter: true,
	type: 1,
};