const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer } = require('@discordjs/voice');
const fs = require('node:fs');
const youtubedl = require('youtube-dl-exec');
const youtube = require('youtube-sr').default;
const queueHandler = require('../queueHandler.js')
const fetch = require('isomorphic-unfetch');
const { abort } = require('node:process');
const { Console } = require('node:console');
const { getData, getPreview, getTracks, getDetails } = require('spotify-url-info')(fetch)

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Joins your current vc and plays a specified URL or name!')
        .addStringOption((option) => option.setName('query').setDescription('Accepts a URL or song name').setRequired(true)),
    async execute(client, emitter, interaction) {
        let musicFile;
        let firstPlay = false;
        let voiceConnection;
        const id = await interaction.member.voice.channelId;

        if(!client.queue.get(interaction.guildId)){
            firstPlay = true;
            client.queue.set(interaction.guildId, [[id, interaction.guild.voiceAdapterCreator, 0], []]);
        }

        const player = createAudioPlayer();
        const input = await interaction.options.getString('query');
        let musicOut;
        const abort = new AbortController();
        messageFooter = ""

        if (!id)
        {
            await interaction.reply({
                "embeds": [
                    {
                        "type": "rich",
                        "title": `Error`,
                        "description": 'You must be in a voice channel to use this command!',
                        "color": 0xe67c00,
                    },
                ]
            });
            return;
        }

        await interaction.deferReply();

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
            });
            abort.abort();
        }
        else if(queryType[0] == "s") {
            let query = spotifyToQuery(input);
            query.then(async (param) => {
                let video = await youtube.search(param, {limit: 1});
                let url = `https://www.youtube.com/watch?v=${video[0].id}`;
                console.log(url)
                messageFooter = 'Results may not be accurate due to querying youtube with the spotify track';
                let yt = playYoutubeURL(url, client, interaction);
                yt.then((params) => {
                    musicOut = params[0];
                    musicFile = params[1];
                    console.log(musicFile)
                    reply(interaction, musicOut, messageFooter, firstPlay);
                    joinVoiceAndOrManageTrack(client, interaction, id, musicOut, voiceConnection, player, emitter, firstPlay);
                });
            });
        }
        else if(queryType[0] == "yt") {
            let yt = playYoutubeURL(input, client, interaction);
            yt.then((params) => {
                musicOut = params[0];
                musicFile = params[1];
                reply(interaction, musicOut, messageFooter, firstPlay);
                joinVoiceAndOrManageTrack(client, interaction, id, musicOut, voiceConnection, player, emitter, firstPlay);
            });
        }
        else
        {
            let video = await youtube.search(input, {limit: 1});
            let url = `https://www.youtube.com/watch?v=${video[0].id}&ab_channel=${video[0].channel.name}`;
            let yt = playYoutubeURL(url, client, interaction);
            yt.then((params) => {
                console.log(params);
                musicOut = params[0];
                musicFile = params[1];
                reply(interaction, musicOut, messageFooter, firstPlay);
                joinVoiceAndOrManageTrack(client, interaction, id, musicOut, voiceConnection, player, emitter, firstPlay);
            });
        }   

        // client.queue.get(interaction.guildId)[2].push(musicOut)

        //Processes raw files into normal mp3 files
        // try {
        //     var process = new ffmpeg('bin/discord/julia.mov');
        //     process.then(function (video) {
        //         // Callback mode
        //         video.fnExtractSoundToMP3('bin/discord/julia.mp3', function (error, file) {
        //             if (!error)
        //             {
        //                 console.log('Audio file: ' + file);
        //                 musicFile = file;
        //                 unlinkSync(inputFile)
        //                 resource = createAudioResource(file.toString());
        //             }
        //             else
        //                 console.log(error)
        //         });
        //     }, function (err) {
        //         console.log('Error: ' + err);
        //     })
        // } catch (e) {
        //     console.log(e.code);
        //     console.log(e.msg);
        // }
        
    },
    passClient: true,
    passEmitter: true,
    type: 1,
};

function identifyQueryType(input)
{

    if(input.length > 6 && input.substring(0, 7) == "http://")
        return(['error', 'Invalid SSL certificate. Make sure your link starts with https://!']);
    else if(input.length > 7 && input.substring(0, 8) == "https://") {
        var ytrx = new RegExp("https://((?:www\.)?youtube.com|youtu.be)");

        if(input.match("https://open.spotify.com") == 'https://open.spotify.com')
        {
            return(["s"]);
        }
        else if(input.match(ytrx)[0] == 'https://www.youtube.com' || input.match(ytrx)[0] == 'https://youtu.be')
        {
            return(["yt"]);
        }
        else
            return(['error', 'Invalid URL. This bot currently supports only youtube and spotify.']);
    }  
    else {
        return([null]);
    }
}

function spotifyToQuery(url)
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
                output: '[%(id)s]-%(epoch)s.%(ext)s)',
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
                client.queue.delete(interaction.guildId);
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
                client.queue.set(interaction.guildId, [[id, interaction.guild.voiceAdapterCreator, 0], []]);
                abort.abort();
            }
        });
    return promise;
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

function joinVoiceAndOrManageTrack(client, interaction, channelId, musicOut, voiceConnection, player, emitter, firstPlay){
    if (firstPlay)
            {
                voiceConnection = joinVoiceChannel({
                    channelId: channelId,
                    guildId: interaction.guild.id,
                    selfDeaf: true,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                }).subscribe(player);

                client.queue.get(interaction.guildId)[1].push(musicOut)
                queueHandler.execute(client, emitter, interaction, player, voiceConnection)
                emitter.emit('play', null)
                console.log('l: ' + client.queue.get(interaction.guildId)[1].length)
            }
            else
            {
                client.queue.get(interaction.guildId)[1].push(musicOut)
                console.log('l: ' + client.queue.get(interaction.guildId)[1].length)
                emitter.emit('trackAdded', musicOut)
            }
}