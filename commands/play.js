const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus, VoiceConnectionStatus, joinVoiceChannel, getVoiceConnection, entersState, createAudioResource } = require('@discordjs/voice');
const youtubedl = require('youtube-dl-exec');
const youtube = require('youtube-sr').default;
const fetch = require('isomorphic-unfetch');
const { abort } = require('node:process');
const { getPreview, getDetails } = require('spotify-url-info')(fetch)
const misc = require('../botMisc.js')
const chalk = require('chalk');
var guildId;
var client;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Joins your current vc and plays a specified URL or name! Plays first 100 songs at max.')
        .addStringOption((option) => option.setName('query').setDescription('Accepts a URL or song name').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        if (await misc.initializePlayCommand(interaction)) {return};

        client = interaction.client;
        guildId = interaction.guildId;

        let voiceInfo = client.queue.get(guildId)
        let firstPlay = false;
        let voiceConnection;

        const id = await interaction.member.voice.channelId;
        const player = voiceInfo.voice.player;
        const input = await interaction.options.getString('query');
        
        let musicOut;
        var messageFooter = "";
        
        if(!voiceInfo.voice.voiceChannelId){
            firstPlay = true;
            voiceInfo.voice.voiceChannelId = interaction.member.voice.channelId;
        }

        const queryType = identifyQueryType(input)
        if(queryType[0] == 'error') {
            await interaction.editReply({
                "embeds": [
                    {
                        "type": "rich",
                        "title": `Error`,
                        "description": queryType[1],
                        "color": 0xe67c00,
                    },
                ]
            })
            return;
        } else if(queryType[0] == "s") {
            let query = singleSpotifyToQuery(input);
            query.then(async (param) => {
                let video = await youtube.search(param, {limit: 1});
                let url = `https://www.youtube.com/watch?v=${video[0].id}`;
                messageFooter = 'Results may not be accurate due to querying youtube with the spotify track';
                let yt = playYoutubeURL(url, client, interaction);
                yt.then((params) => {
                    musicOut = params[0];
                    musicFile = params[1];
                    reply(interaction, musicOut, messageFooter, firstPlay);
                    joinVoiceAndOrManageTrack(interaction, musicOut, firstPlay);
                });
            });
        } else if(queryType[0] == "s-p") {
            let start = 0;

            await spotifyPlaylistToQuery(input, interaction)
            .then(async (param) => {
                let video = await youtube.search(param[start], {limit: 1});
                while(video[0] == undefined && start < param.length) {
                    start++;
                    video = await youtube.search(param[start], {limit: 1});   
                }
                if(start >= param.length) {
                    await interaction.editReply({
                        "embeds": [
                            {
                                "type": "rich",
                                "title": `Error`,
                                "description": `Failed to find any songs in the requested playlist.`,
                                "color": 0xe67c00,
                            },
                        ]
                    });
                    return;
                }
                let url = `https://www.youtube.com/watch?v=${video[0].id}`;
                messageFooter = 'Results may not be accurate due to querying youtube with the spotify track';
                let yt = playYoutubeURL(url, client, interaction);
                yt.then((params) => {
                    musicOut = params[0];
                    musicFile = params[1];
                    reply(interaction, musicOut, messageFooter, firstPlay);
                    joinVoiceAndOrManageTrack(interaction, musicOut, firstPlay);
                });
            });

            let failed = [];
            spotifyPlaylistToQuery(input, interaction)
            .then(async (param) => {
                for(i = start + 1; i < param.length; i++)
                {
                    await youtube.search(param[i], {limit: 1})
                    .then (async (params) => {
                            if (params[0] == undefined)
                            {
                                failed.push(param[i]);
                            }
                            else {
                                let id = params[0].id;
            
                                let url = `https://www.youtube.com/watch?v=${id}`;
                                messageFooter = 'Results may not be accurate due to querying youtube with the spotify track';
                                let yt = playYoutubeURL(url, client, interaction);
                                yt.then((params1) => {
                                    musicOut = params1[0];
                                    musicFile = params1[1];
                                    
                                    manageTrack(interaction, musicOut);
                                })
                            }
                        })
                        .catch((err) => {console.log(err)});                    
                }
                if(failed.length > 0) {
                    await interaction.editReply({
                        "embeds": [
                            {
                                "type": "rich",
                                "title": `Error`,
                                "description": `Failed to find ${failed.length} tracks. They have been skipped.`,
                                "color": 0xe67c00,
                            },
                        ]
                    });
                }

            });
        } else if(queryType[0] == "yt") {
            playYoutubeURL(input, client, interaction)
            .then((params) => {
                musicOut = params[0];
                musicFile = params[1];
                reply(interaction, musicOut, messageFooter, firstPlay);
                joinVoiceAndOrManageTrack(interaction, musicOut, firstPlay);
            });
        }
        else if(queryType[0] == "yt-p") {
            youtube.getPlaylist(input, {limit: 100})
            .then(async (playlist) => {
                interaction.editReply({
                    "embeds": [
                    {
                        thumbnail: {
                            "url": playlist.thumbnail.url,
                        },
                        "type": "rich",
                        "title": `Now Playing:`,
                        "description": `**${playlist.title}** \n by: *${playlist.channel.name}* (${Math.min(playlist.videoCount, 100)} videos)`,
                        "color": 0xe67c00
                    }
                    ]
                });

                let url = `https://www.youtube.com/watch?v=${playlist.videos[0].id}`;
                await playYoutubeURL(url, client, interaction)
                .then((params) => {
                    musicOut = params[0];
                    musicFile = params[1];
                    reply(interaction, musicOut, messageFooter, firstPlay);
                    joinVoiceAndOrManageTrack(interaction, musicOut, firstPlay);
                }); 

                for(let i = 1; i < playlist.videos.length; i++)
                {
                    console.log(i)

                    let url = `https://www.youtube.com/watch?v=${playlist.videos[i].id}`;
                    await playYoutubeURL(url, client, interaction)
                    .then((params) => {
                        musicOut = params[0];
                        musicFile = params[1];
                        manageTrack(interaction, musicOut);
                    }); 
                }
            })
            .catch((error) => {
                console.log(error)
                client.queue.delete(guildId);
                interaction.editReply({
                    "embeds": [
                        {
                            "type": "rich",
                            "title": `Error`,
                            "description": error.message,
                            "color": 0xe67c00,
                        },
                    ]
                })
                return;
            })
        }
        else
        {
            let video = await youtube.search(input, {limit: 1});
            let url = `https://www.youtube.com/watch?v=${video[0].id}&ab_channel=${video[0].channel.name}`;
            let yt = playYoutubeURL(url, client, interaction);
            yt.then((params) => {
                musicOut = params[0];
                musicFile = params[1];
                reply(interaction, musicOut, messageFooter, firstPlay);
                joinVoiceAndOrManageTrack(interaction, musicOut, firstPlay);
            });
        }   
        
    },
    type: 1,
};

function identifyQueryType(input)
{

    if(input.length > 6 && input.substring(0, 7) == "http://")
        return(['error', 'Invalid URL. Make sure your link starts with https://!']);
    else if(input.length > 7 && input.substring(0, 8) == "https://") {
        var ytrx = new RegExp("https://((?:www\.)?youtube.com|youtu.be)");

        if(input.match("https://open.spotify.com") == 'https://open.spotify.com')
        {
            if(input.match("https://open.spotify.com/playlist/") == 'https://open.spotify.com/playlist/' || input.match("https://open.spotify.com/album/") == 'https://open.spotify.com/album/')
                return(["s-p"]);
            else
                return(["s"]);
        }
        else if(input.match(ytrx)[0] == 'https://www.youtube.com' || input.match(ytrx)[0] == 'https://youtu.be')
        {
            if(input.match("https://www.youtube.com/playlist") == 'https://www.youtube.com/playlist' || input.match("&list=") == '&list=')
                return(["yt-p"]);
            else
                return(["yt"]);
        }
        else
            return(['error', 'Invalid URL. This bot currently supports only youtube and spotify.']);
    }  
    else {
        return([null]);
    }
}

function spotifyPlaylistToQuery(url, interaction)
{
    const promise = new Promise(async (resolve, reject) => {
        let spotifyData;
        try {
            spotifyData = await getDetails(url);
        } catch (error) { 
            console.error(misc.error(error)); 
            defaultError(interaction);
            return;
        }
        let playlist = [];
        for(i = 0; i < spotifyData.tracks.length; i++)
            playlist.push(`${spotifyData.tracks[i].name} by ${spotifyData.tracks[i].artist}`);
        resolve(playlist);
    });
    return promise;
}

function singleSpotifyToQuery(url)
{
    const promise = new Promise(async (resolve, reject) => {
        let spotifyData = await getPreview(url);
        resolve(`${spotifyData.track} by ${spotifyData.artist}`);
    });
    return promise;
}

async function playYoutubeURL(url, client, interaction) 
{
    const promise = new Promise((resolve, reject) => {
        try {
            //Download video from URL and set variables to easily access the file
            youtubedl(url, {
                noCheckCertificates: true,
                paths: `bin/${interaction.guild.id}/ytdl`,
                // output: '[%(id)s]-%(epoch)s.%(ext)s)',
                output: '[%(id)s]-%(epoch)s',
                q: '',
                noSimulate: true,
                audioFormat: 'opus',
                dumpJson: true,
                noWarnings: true,
                audioMultistreams: true, 
                preferFreeFormats: true,
                extractAudio: true,
                addHeader: [
                    'referer:youtube.com',
                    'user-agent:googlebot'
                ]
            }).then(output => {
                resolve ([output, `[${output.display_id}]-${output.epoch}.opus`]);
            })
        } catch (error) {
                console.log(error)
                client.queue.delete(guildId);
                interaction.editReply({
                    "embeds": [
                        {
                            "type": "rich",
                            "title": `Error`,
                            "description": 'An error occured. Please wait a few seconds and try again.',
                            "color": 0xe67c00,
                        },
                    ]
                });
                return;
            }
        });
    return promise;
}

async function defaultError(interaction) {
    return new Promise((resolve) => {
        interaction.editReply({
            "embeds": [
            {
                "type": "rich",
                "title": `Error`,
                "description": `Something terribly wrong happened, <@741343008145801307> fix this!!`,
                "footer": {
                    "text": 'what have you done'
                },
                "color": 0xe67c00
            }
            ]
        })
    })
}

function reply(interaction, musicOut, messageFooter, firstPlay)
{
    if(firstPlay)
        interaction.editReply({
            "embeds": [
            {
                thumbnail: {
                    "url": musicOut.thumbnail,
                },
                "type": "rich",
                "title": `Now Playing:`,
                "description": `**${musicOut.fulltitle}** \n by: *${musicOut.channel}* (${musicOut.duration_string})`,
                "footer": {
                    "text": messageFooter
                },
                "color": 0xe67c00
            }
            ]
        });
    else
        interaction.editReply({
            "embeds": [
            {
                thumbnail: {
                    "url": musicOut.thumbnail,
                },
                "type": "rich",
                "title": `Added to the queue:`,
                "description": `**${musicOut.fulltitle}** \n by: *${musicOut.channel}* (${musicOut.duration_string})`,
                "footer": {
                    "text": messageFooter
                },
                "color": 0xe67c00
            }
            ]
        });
}

function joinVoiceAndOrManageTrack(interaction, musicOut, firstPlay){
    // let client = interaction.client;
    let voiceInfo = client.queue.get(guildId)
    let channelId = voiceInfo.voice.voiceChannelId

    if (firstPlay)
    {
        firstPlay = false;

        voiceInfo.voice.connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guildId,
            selfDeaf: true,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        }).subscribe(voiceInfo.voice.player).connection;

        voiceInfo.queue.push(musicOut)
        playFirstTrack(interaction)
        console.log(misc.dimmed('Added first song to index ' + voiceInfo.queue.length))
    }
    else
    {
        manageTrack(interaction, musicOut)
    }
}

function manageTrack(interaction, musicOut){
    // let client = interaction.client
    let voiceInfo = client.queue.get(guildId)

    if(!musicOut)
        console.log("Musicout is undefined???")
    voiceInfo.queue.push(musicOut)
    console.log(misc.dimmed('Added song to index ' + voiceInfo.queue.length))
    manageAddedTrack(interaction, musicOut);
}

function playFirstTrack(interaction) {
    // let client = interaction.client
    let voiceInfo = client.queue.get(guildId)
    let voiceConnection = voiceInfo.voice.connection
    let player = voiceInfo.voice.player
    musicOut = voiceInfo.queue[0]
    musicFile = `[${musicOut.id}]-${musicOut.epoch}.opus`

    console.log(chalk.blue(musicFile))

    console.log('1')
    resource = createAudioResource(`bin/${guildId}/ytdl/${musicFile}`)
    console.log('2')
    player.play(resource);

    voiceInfo.voice.idleInterval = setInterval(() => {
      client.channels.fetch(voiceInfo.voice.voiceChannelId)
      .then(channel => {
        if(!voiceInfo.voice.voiceChannelId) {
            clearInterval(voiceInfo.voice.idleInterval)
            return;
        } else if(channel.members.size < 2) {
            misc.disconnect(interaction, 'Player left because no one is in the voice channel!')
            clearInterval(voiceInfo.voice.idleInterval)
        }
      })
      .catch(console.error);
    }, 30000);

    voiceConnection.addListener(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        try {
            await Promise.race([
            entersState(voiceConnection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(voiceConnection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch (error) {
            await misc.disconnect(interaction, "The bot was disconnected from the voice channel")
        }
        });

    player.addListener(AudioPlayerStatus.Idle, async () =>
    {
        console.log(misc.warning('Player is now idle!'))
        let loop = voiceInfo.queueInfo.looping
        let currentTrack = voiceInfo.queueInfo.currentTrack

        if(voiceInfo.queue[currentTrack + 1] || loop == 2) {
            if(loop == 0 || loop == 1 )
                voiceInfo.queueInfo.currentTrack++;
            currentTrack = voiceInfo.queueInfo.currentTrack
            let musicOut = await voiceInfo.queue[currentTrack];
            let musicFile = `[${musicOut.display_id}]-${musicOut.epoch}.opus`
            let resource = createAudioResource(`bin/${guildId}/ytdl/${musicFile}`);
            await player.play(resource);
        } else if(loop == 1) {
            voiceInfo.queueInfo.currentTrack = 0;
            let musicOut = await client.queue.get(guildId).queue[currentTrack];
            let musicFile = `[${musicOut.display_id}]-${musicOut.epoch}.opus`
            let resource = createAudioResource(`bin/${guildId}/ytdl/${musicFile}`);
            await player.play(resource);
        } else {
            new Promise(async r => {
                await new Promise(r => setTimeout(r, 180000));
                if(player._state.status === 'idle') {
                    misc.disconnect(interaction, 'Player left because it was inactive for too long.')
                }
            });
        }
    });
}

async function manageAddedTrack(interaction, musicOut) {
    // client = interaction.client;
    player = client.queue.get(guildId).voice.player
    console.log(misc.dimmed("Currently " + await player._state.status + " after trying to play nth track"))

    if(player._state.status === 'idle')
    {
        client.queue.get(guildId).queueInfo.currentTrack++;

        let musicFile = `[${musicOut.id}]-${musicOut.epoch}.opus`
        console.log(musicFile)

        resource = createAudioResource(`bin/${guildId}/ytdl/${musicFile}`)
        player.play(resource);
    }
}