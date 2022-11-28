const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unpause')
		.setDescription('Resumes the current track.'),
	async execute(emitter, interaction) {

		await interaction.deferReply();

        await emitter.emit('resume', null)

        await interaction.editReply({
            "embeds": [
                {
                    "type": "rich",
                    "title": `Successfully resumed the queue!`,
                    "color": 0xe67c00,
                },
            ]
        });
	},
	passClient: false,
    passEmitter: true,
	type: 1,
};