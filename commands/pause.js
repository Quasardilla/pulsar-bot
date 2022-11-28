const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Pauses the currently playing track.'),
	async execute(emitter, interaction) {

		await interaction.deferReply();

        await emitter.emit('pause', null)

        await interaction.editReply({
            "embeds": [
                {
                    "type": "rich",
                    "title": `Successfully paused the current playing song!`,
                    "color": 0xe67c00,
                },
            ]
        });
	},
	passClient: false,
    passEmitter: true,
	type: 1,
};