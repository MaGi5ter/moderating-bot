const { Client, Events, GatewayIntentBits,PermissionsBitField } = require('discord.js');
const { ownerID,prefix ,token } = require('./config.json');
const fs = require('fs');
const db = require('./mysql')
const score = require('./scripts/score')

let commands = []

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command);
}

console.log('Loaded:',commands.length,'commands')

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
] });

client.once(Events.ClientReady, async c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

    //here check if any user is in voice chat to calculate his time spent, after restart of the bot

    let get_guild_list = 'SELECT * FROM y_guild_track_users'
    let guild_list = await dbquery(get_guild_list, undefined, db)

    for (const guild of guild_list) {
        const guild_fetched = await client.guilds.fetch(guild.guild_id).catch(error => {
            //IF THERE IS ERROR IT MOSTLY IS THAT BOT IS NO LONGER IN THAT GUILD
        }) 

        if(!guild_fetched) continue

        const voiceStates = guild_fetched.voiceStates.cache.values();

        for (const voiceState of voiceStates) {

            let user = voiceState.id
            let guild = guild_fetched.id

            const guild_tracking = require('./scripts/guild_tracking')
            guild_tracking.voicechat(user, guild,client,db);
        }
    }
});

client.on("messageCreate", async (message) => {
    if( message.author.bot || !message.content.startsWith(prefix) || message.webhookId) return

    let channelID = message.channel.id
            
    let check_query = 'SELECT * FROM y_excluded_channels WHERE channel_id = ?'
    let params = [channelID]

    let check = await dbquery(check_query,params,db)

    if(check.length > 0 && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        message.delete()
        message.author.send('Using commands on this channel is disabled')
        return
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const commandID = commands.findIndex(element => element.name == command)
    if(commandID == -1) {return}
    else commands[commandID].execute(message,args,commands,db,client)
    
})

//USERS ACTIVITY TRACKING /////////////////////////////////////////////////////////////////////

client.on("messageCreate", async (message) => {

    if(message.content.startsWith(prefix) || message.author.bot || message.webhookId) return
    //TRACKING

    let check_if = `
        SELECT 'track_user' AS id FROM y_guild_track_users WHERE guild_id = ?
        UNION ALL
        SELECT 'copy_channel' AS id FROM y_channel_copy WHERE channel_id =  ?
    `
    let check_params = [message.guild.id , message.channel.id]
    let check_result = await dbquery(check_if,check_params,db)

    if(!check_result[0]) return

    // console.log(check_result)

    try {
        if(check_result[0].id == 'track_user' ) { //IF SERVER EXISTS IN DB THAT MEANS IT IS TRACKED
            const guild_tracking = require('./scripts/guild_tracking')
            guild_tracking.message(message,db,client)

            let scoreTotal = await score.message(message,db)
            // console.log(scoreTotal)

            if(scoreTotal > 0 ) score.save(db ,message.guild.id, message.author.id , scoreTotal , 'message score')
        }
    
        if(check_result[0].id == 'copy_channel' || check_result[1].id == 'copy_channel') {
            const copy = require('./scripts/channel_copying')
            copy.copy_check(message,db,client)
        }   
    } catch (error) {
        if(error) {
            //do nothing
        }
    }

})

client.on('voiceStateUpdate', async (oldState, newState) => {

    let check_if_guild_tracked = `SELECT * FROM y_guild_track_users WHERE guild_id = ?`
    let check_params = [oldState.guild.id]
    let check = await dbquery(check_if_guild_tracked,check_params,db)

    if(check.length > 0) { //IF SERVER EXISTS IN DB THAT MEANS IT IS TRACKED
        if (oldState.channelId !== newState.channelId) {

            // console.log('nowy state')

            const guild_tracking = require('./scripts/guild_tracking')

            const userId = oldState.member.id; 
            const guildId = oldState.guild.id; 
        
            const voiceTime = await guild_tracking.voicechat(userId, guildId,client,db);
            // guild_tracking.update_voice(userId,guildId,db,voiceTime)
        
            console.log(`${userId} has spent ${voiceTime} seconds in voice chat`);
        }
    }
});

client.on('messageDelete', async (message) => { //USERS WERE ABUSING COUNTER BY SENDIND AND DELETING MESSAGES SO I'VE MADE THIS

    let check_if_guild_tracked = `SELECT * FROM y_guild_track_users WHERE guild_id = ?`
    let check_params = [message.guildId]
    let check = await dbquery(check_if_guild_tracked,check_params,db)

    if(check.length > 0) { //IF SERVER EXISTS IN DB THAT MEANS IT IS TRACKED
        let messageCreated = message.createdTimestamp
        let userID = message.author.id
        let  guildID = message.guildId
        let messageDate =  new Date(messageCreated).toISOString().slice(0, 10);
        console.log(userID ,messageDate)   

        let guild_tracking = require('./scripts/guild_tracking')
        guild_tracking.removeMessageActivity(db , guildID , userID , messageDate)
    }
})

/////////////////////////////////////////////////////////////////////////////////////////////////////

client.login(token);

//ACTIVITIES THAT NEED TO BE DONE ONCE A WHILE 
const guild_tracking = require('./scripts/guild_tracking')
guild_tracking.rankUpdates(db,client)
setInterval(() => {
    guild_tracking.rankUpdates(db,client)
}, 1000 * 60 * 60 * 2);

function dbquery(prompt,variables,db) {
    return new Promise((resolve,reject) => {
        db.query(prompt,variables, function (err,rows){
           if(err) reject(err)
           else resolve(rows)
        })
    })
}