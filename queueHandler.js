const { createAudioPlayer, AudioPlayerStatus, VoiceConnectionStatus, joinVoiceChannel, getVoiceConnection, entersState, createAudioResource } = require('@discordjs/voice');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    async execute(client, emitter, interaction, player) {

      let voiceConnection = getVoiceConnection(interaction.guildId);
      const channel = client.channels.cache.get(interaction.channelId);
      
      let killed = false;
      let currentTrack = 0;
      let idle = false;
      let commandDc = false;

      //Managing Commands

      emitter.on('dc', async (arg1, arg2) => {
        let intentional = arg1;
        commandDc = true;

        if(!intentional)
        {
          let desc = arg2;
          console.log(desc)

          channel.send({
            "embeds": [
                {
                    "type": "rich",
                    "title": `Succesfully destroyed the player!`,
                    "description": desc,
                    "color": 0xe67c00,
                },
            ]
          });
        }

        if(voiceConnection)
        {
          try {
            voiceConnection.destroy();
          } catch (error) {
            console.log(error)
          }
        }
        client.queue.delete(interaction.guildId);
        this.clearSongs(interaction.guildId);
        emitter.removeAllListeners();
        player.removeAllListeners();
        voiceConnection.removeAllListeners();
        const abortController = new AbortController();
        abortController.abort();
      });

      emitter.addListener('resume', async () => {
        player.unpause();
      });

      emitter.addListener('pause', async () => {
        player.pause();
      });

      emitter.addListener('clear', async () => {
        for(let i = 0; i < client.queue.get(interaction.guildId)[1].length - 1; i++)
          client.queue.get(interaction.guildId)[1].shift();
      });

      emitter.addListener('stop', async () => {
        player.stop();
      });

      emitter.addListener('remove', async (track, altInteraction) => {
        if(track <= client.queue.get(interaction.guildId)[1].length && track != client.queue.get(interaction.guildId)[0][2]) {
          client.queue.get(interaction.guildId)[1].splice(track, 1)
          if(track < client.queue.get(interaction.guildId)[0][2])
          {
            currentTrack--;
            client.queue.get(interaction.guildId)[0][2] = currentTrack;
          }
          altInteraction.editReply({
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
        altInteraction.editReply({
          "embeds": [
              {
                  "type": "rich",
                  "title": `Track ${track} is less than the current song, or out of bounds of the queue`,
                  "color": 0xe67c00,
              },
          ]
        })
          
      });

      emitter.addListener('skip', async (altInteraction) => {
        if(client.queue.get(interaction.guildId)[1][currentTrack + 1])
        {
          player.stop();

          currentTrack++;
          client.queue.get(interaction.guildId)[0][2] = currentTrack;

          musicOut = client.queue.get(interaction.guildId)[1][currentTrack]
          musicFile = `[${musicOut.display_id}]-${musicOut.epoch}.opus`

          resource = createAudioResource(`bin/${interaction.guildId}/ytdl/${musicFile}`)
          player.play(resource);

          await altInteraction.editReply({
            "embeds": [
                {
                    "type": "rich",
                    "title": `Skipped to the next song!`,
                    "color": 0xe67c00,
                },
            ]
        });
        }
        else
        {
          await altInteraction.editReply({
            "embeds": [
                {
                    "type": "rich",
                    "title": `There is no song to skip to!`,
                    "color": 0xe67c00,
                },
            ]
          });
        }
      });

      //End of managing Commands

      voiceConnection.addListener(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        if(!commandDc)
        try {
          await Promise.race([
            entersState(voiceConnection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(voiceConnection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          await emitter.emit('dc', false, "The bot was disconnected from the voice channel")
        }
      });

      emitter.addListener('trackAdded', (musicOut) => {
        if(idle)
          {
          idle = false;
          console.log('t: ' + currentTrack)
          currentTrack++;
          client.queue.get(interaction.guildId)[0][2] = currentTrack;

          musicFile = `[${musicOut.display_id}]-${musicOut.epoch}.opus`

          resource = createAudioResource(`bin/${interaction.guildId}/ytdl/${musicFile}`)
          player.play(resource);
        }
      });

      emitter.on('play', async () => {
        musicOut = client.queue.get(interaction.guildId)[1][0]
        musicFile = `[${musicOut.display_id}]-${musicOut.epoch}.opus`

        resource = createAudioResource(`bin/${interaction.guildId}/ytdl/${musicFile}`)
        player.play(resource);
        player.addListener(AudioPlayerStatus.Idle, async () =>
        {
          if(client.queue.get(interaction.guildId)[1][currentTrack + 1])
          {
            currentTrack++;
            console.log("t: " + currentTrack)
            client.queue.get(interaction.guildId)[0][2] = currentTrack;
            musicOut = await client.queue.get(interaction.guildId)[1][currentTrack];
            musicFile = `[${musicOut.display_id}]-${musicOut.epoch}.opus`
            console.log(musicFile)
            resource = createAudioResource(`bin/${interaction.guildId}/ytdl/${musicFile}`);
            await player.play(resource);
          }
          else
          {
            idle = true;
            console.log("idle!")

            new Promise(async r => {
              await new Promise(r => setTimeout(r, 180000));
                if(AudioPlayerStatus.Idle)
                  emitter.emit('dc', false, 'Player left because it was inactive for too long')
            });

          }
        });
      });
    },
    clearSongs(guildId) {
      console.log("clearing!")

      if(fs.existsSync(`bin/${guildId}/ytdl`))
        fs.readdir(`bin/${guildId}/ytdl/`, (err, files) => {
            if (err) throw err;
          
            for (const file of files) {
              fs.unlink(path.join(`bin/${guildId}/ytdl/`, file), (err) => {
                if (err) throw err;
              });
            }
          });
      if(fs.existsSync(`bin/${guildId}/sdl`))
        fs.readdir(`bin/${guildId}/sdl/`, (err, files) => {
          if (err) throw err;
        
          for (const file of files) {
            fs.unlink(path.join(`bin/${guildId}/sdl/`, file), (err) => {
              if (err) throw err;
            });
          }
          });
      if(fs.existsSync(`bin/${guildId}/discord`))
        fs.readdir(`bin/${guildId}/discord/`, (err, files) => {
            if (err) throw err;
          
            for (const file of files) {
              fs.unlink(path.join(`bin/${guildId}/discord/`, file), (err) => {
                if (err) throw err;
              });
            }
          });
    },
}

