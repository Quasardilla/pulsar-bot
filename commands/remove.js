const { SlashCommandBuilder } = require('discord.js');
const misc = require('../botMisc.js')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Removes a track from the queue.')
        .addIntegerOption((option) => option.setName('track').setDescription('Any track available in the queue').setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply();
		if (await misc.initializeCommand(interaction)) {return};

		let client = interaction.client
		let voiceInfo = client.queue.get(interaction.guildId)
		
        const track = interaction.options.getInteger('track');
		console.log(voiceInfo.queue.length)

		if(track == voiceInfo.queue.length) {
			voiceInfo.queue.pop();
			interaction.editReply({
				"embeds": [
					{
						"type": "rich",
						"title": `Successfuly removed track ${track}.`,
						"color": 0xe67c00,
					},
				]
			  });
		} else if(track == voiceInfo.queue.length && track != voiceInfo.queueInfo.currentTrack) {
			console.log(voiceInfo.queue.splice(track, 1))
			if(track < voiceInfo.queueInfo.currentTrack)
			{
				voiceInfo.queueInfo.currentTrack--;
			}
			interaction.editReply({
				"embeds": [
					{
						"type": "rich",
						"title": `Successfuly removed track ${track}.`,
						"color": 0xe67c00,
					},
				]
			});
		}
		else
		interaction.editReply({
			"embeds": [
				{
					"type": "rich",
					"title": `Track ${track} was played before the current song, or is out of bounds of the queue`,
					"color": 0xe67c00,
				},
			]
		})
		
		console.log(voiceInfo.queue.length)
	},
	type: 1,
};