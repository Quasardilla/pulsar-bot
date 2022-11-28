const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dc')
		.setDescription('Disconnects the bot from the & clears the queue.'),
	async execute(emitter, interaction) {

		await interaction.deferReply();

        emitter.emit('dc', true)

        await interaction.editReply({
            "embeds": [
                {
                    "type": "rich",
                    "title": `Succesfully destroyed the player!`,
                    "description": 'Player was disconnected via the /dc command',
                    "color": 0xe67c00,
                },
            ]
        });
	},
	passClient: false,
    passEmitter: true,
	type: 1,
};