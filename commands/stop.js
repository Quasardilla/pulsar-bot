const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stops and destroys current track.'),
	async execute(emitter, interaction) {

		await interaction.deferReply();

        await emitter.emit('stop', null);

        await interaction.editReply({
            "embeds": [
                {
                    "type": "rich",
                    "title": `Stopped current track.`,
                    "color": 0xe67c00,
                },
            ]
        });

	},
	passClient: false,
    passEmitter: true,
	type: 1,
};