const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('A cute little tutorial command that replies with Pong!'),
	async execute(interaction) {
		await lib.discord.channels['@0.3.2'].messages.create({
            "channel_id": `${context.params.event.channel_id}`,
            "content": "",
            "tts": false,
            "components": [
              {
                "type": 1,
                "components": [
                  {
                    "style": 3,
                    "label": `Back`,
                    "custom_id": `row_0_button_0`,
                    "disabled": false,
                    "type": 2
                  },
                  {
                    "style": 3,
                    "label": `Next`,
                    "custom_id": `row_0_button_1`,
                    "disabled": false,
                    "type": 2
                  }
                ]
              }
            ],
            "embeds": [
              {
                "type": "rich",
                "title": `title`,
                "description": `**desc**\ncry about it`,
                "color": 0x00FFFF
              }
            ]
          });
	},
};
