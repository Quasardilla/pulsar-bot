const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('clear')
		.setDescription('Clears the queue.'),
	async execute(emitter, interaction) {

		await interaction.deferReply();

        await emitter.emit('clear', null)

        await interaction.editReply({
            "embeds": [
                {
                    "type": "rich",
                    "title": `Successfully cleared the queue!`,
                    "color": 0xe67c00,
                },
            ]
        });
	},
	passClient: false,
    passEmitter: true,
	type: 1,
};