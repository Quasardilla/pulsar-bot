const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Displays a list of all the songs in queue.'),
	async execute(client, interaction) {

		await interaction.deferReply();

        if(!client.queue.get(interaction.guildId))
        {
            await interaction.editReply({
                "embeds": [
                    {
                        "type": "rich",
                        "title": `Queue: `,
                        "description": `Queue is empty!`,
                        "color": 0xe67c00,
                    },
                ]
            });
            return;
        }

        await interaction.editReply({
            "embeds": [
                {
                    "type": "rich",
                    "title": `Queue: `,
                    "description": makeQueue(client, interaction),
                    "color": 0xe67c00,
                    "footer": {
                        "text": makeFooter(client, interaction),
                    }
                },
            ]
        });
	},
	passClient: true,
    passEmitter: false,
	type: 1,
};

function makeQueue(client, interaction)
{
    currentTrack = client.queue.get(interaction.guildId)[0][2];
    let queueString = "";

    for(let i = 0; i < client.queue.get(interaction.guildId)[1].length; i++)
    {
        let musicOut = client.queue.get(interaction.guildId)[1][i]

        queueString += (currentTrack == i) ? `${i}. **${musicOut.fulltitle} by ${musicOut.channel} [${musicOut.duration_string}]**` :
        `${i}. ${musicOut.fulltitle} by ${musicOut.channel} [${musicOut.duration_string}]`;

        if(i + 1 < client.queue.get(interaction.guildId)[1].length)  
            queueString += '\n';
    }

    return queueString;
}

function makeFooter(client, interaction)
{
    let footer = `Total tracks: ${client.queue.get(interaction.guildId)[1].length} | Length: `;
    let total = 0;

    for(let i = client.queue.get(interaction.guildId)[0][2]; i < client.queue.get(interaction.guildId)[1].length; i++)
        total += client.queue.get(interaction.guildId)[1][i].duration;

    if(total < 60) {
        //if seconds are less than 1 minute and you only need mm:ss
        let result = new Date(total * 1000).toISOString().slice(17, 19);
        footer += result + ` sec.`
    }
    else if(total < 3600) {
        //if seconds are less than 1 minute and you only need mm:ss
        let result = new Date(total * 1000).toISOString().slice(14, 19);
        footer += result + ` min.`
    }
    else if(total < 86400) {
        //if seconds are less than 1 day and you only need hh:mm:ss
        let result = new Date(total * 1000).toISOString().slice(11, 19);
        footer += result + ` hours`
    }
    else if(total < 604800) {
        //if seconds are less than 1 week and you need dd:hh:mm:ss
        let result = new Date(total * 1000).toISOString().slice(11, 19);
        footer += result + ` days`
    }
    else {
        //if seconds are more than 1 week (uh oh)
        footer += `> 1 week`
    }  

    footer += ` remaining`
    return footer;

}