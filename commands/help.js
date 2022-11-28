const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('displays all commands'),
	async execute(client, interaction) {
  
    await interaction.reply({
      "embeds": [
        {
          "type": "rich",
          "title": `Commands`,
          "description": buildDescription(client),
          "color": 0xe67c00
        }
      ]
    });
  },
  passClient: true,
  passEmitter: false,
  type: 2,
};

function buildDescription(client)
{
  const commands = [];
  const id1 = [];
  const id2 = [];

  const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));

    //type 1 = music
    //type 2 = misc
  for (const file of commandFiles) {
    const command = require(`./${file}`);
    if(command.type == 2)
      id2.push(command.data.toJSON().name);
    else 
      id1.push(command.data.toJSON().name);

  }

  let desc = `**Music Commands: (${id1.length})\n**`;

    for(let i = 0; i < id1.length; i++)
      (i + 1 < id1.length) ? desc += `\`/${id1[i]}\`, ` : desc += `\`/${id1[i]}\``;
  
  desc += `\n **Misc. Commands: (${id2.length})\n**`
  
    for(let i = 0; i < id2.length; i++)
      (i + 1 < id2.length) ? desc += `\`/${id2[i]}\`, ` : desc += `\`/${id2[i]}\``;
    
  return desc;
}
