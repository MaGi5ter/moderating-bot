const {PermissionsBitField} = require('discord.js')
const {EmbedBuilder } = require('discord.js')
const {ActionRowBuilder , ButtonBuilder ,ButtonStyle , ComponentType} = require('discord.js')

module.exports = {
	name: 'stats',
	description: 'displays user statistics from last 7 days\nuse stats <user> to check stats of specific user\nuse stats all to get all user stats',
    type : 'public',
	async execute(message, args,commands,db) {

        let user_id = ''
        let all = false

        const userRegex = /^<@(\d+)>$/;
        if (userRegex.test(args[0])) {
            const userId = args[0].match(userRegex)[1];
            const user = await message.guild.members.fetch(userId);
            if (!user) {
                user_id = message.author.id
            } else user_id = user.id

        } else {
            user_id = message.author.id
        }

        if(args[0] == 'all' || args[1] == 'all') all = true //WILL BE DONE IN FUTURE

        const user = await message.guild.members.fetch(user_id)

        if(!all) {
            // Get the user's voice chat time and message count from database
            const vcTime = await getUserVoiceChatTime(db,user.id, message.guild.id);
            const messageCount = await getUserMessageCount(db,user.id, message.guild.id);

            // Get the user's activity for the last 7 days from database
            const activity = await getUserActivityForLast7Days(db,user.id, message.guild.id);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${user.user.username}'s Stats`)
                .setDescription(`Total Voice Chat Time: ${vcTime} seconds\nTotal Message Count: ${messageCount}\nActivity for the Last 7 Days:`);

            // Add the activity for the last 7 days to the embed
            activity.forEach(a => {

                embed.addFields(
                    {name: a.day ,value : `Voice Chat Time: ${a.vcTime} seconds\nMessage Count: ${a.messageCount}`}
                )
            });

            // Send the embed to the channel
            message.channel.send({ embeds: [embed] });
        } else {

            const activity = await getAllActivity(db,user.id,message.guild.id)
            const vcTime   = await getUserTotalVoiceChatTime(db,user.id, message.guild.id);
            const messageCount = await getUserTotalMessageCount(db,user.id, message.guild.id);

            const PAGE_SIZE = 10; // number of rankings per page
            const pages = Math.ceil(activity.length / PAGE_SIZE);
            let currentPage = 1;

            const generateEmbed = async (page) => {
                return new Promise((resolve) => {
                    const start = (page - 1) * PAGE_SIZE;
                    const end = page * PAGE_SIZE;
                    const currentActivity = activity.slice(start, end);

                    const embed = new EmbedBuilder()
                        .setTitle(`${message.guild.name}`)
                        .setDescription(`Total Voice Chat Time: **${vcTime}** seconds\nTotal Message Count: **${messageCount}**\nShowing page **${page}** of **${pages}**`)
                        .setColor(0x0099FF);

                    currentActivity.forEach(async (rank) => {
                        embed.addFields(
                            {name: rank.day ,value : `Voice Chat Time: ${rank.vcTime} seconds\nMessage Count: ${rank.messageCount}`}
                        )
                    });

                    resolve(embed)
                })
            };

            let row = new ActionRowBuilder()
                .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle('Primary')
                    .setDisabled(currentPage == 1),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle('Primary')
                    .setDisabled(currentPage == pages),
                );

            const messageEmbed = await message.channel.send({ embeds: [await generateEmbed(currentPage)], components: [row] });

            // console.log(row.components)

            const collector = messageEmbed.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 * 5 })

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'next') {
                currentPage++;
                } else if (interaction.customId === 'previous') {
                currentPage--;
                }

                const newEmbed = await generateEmbed(currentPage);

                let row = new ActionRowBuilder()
                .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle('Primary')
                    .setDisabled(currentPage == 1),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle('Primary')
                    .setDisabled(currentPage == pages),
                );

                // console.log(newComponents.components)

                await interaction.update({ embeds: [newEmbed], components: [row] });
            });

            collector.on('end', async () => {
                const finalEmbed = await generateEmbed(currentPage);

                let row = new ActionRowBuilder()
                .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle('Primary')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle('Primary')
                    .setDisabled(true),
                );

                await messageEmbed.edit({ embeds: [finalEmbed], components: [row] });
            });

        }
	},
};

function dbquery(prompt,variables,db) {
    return new Promise((resolve,reject) => {
        db.query(prompt,variables, function (err,rows){
           if(err) reject(err)
           else resolve(rows)
        })
    })
}

async function getUserVoiceChatTime(db, user_id, guild_id) {
    return new Promise(async (resolve, reject) => {
        const query = `
            SELECT SUM(vc_time) AS total_vc_time
            FROM y_guild_users_daily_stats
            WHERE user_id = ? AND guild_id = ? AND day >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        `;
        const parameters = [user_id, guild_id];
        const result = await dbquery(query, parameters, db);
        resolve(result[0].total_vc_time)
    })
  }

  async function getUserTotalVoiceChatTime(db, user_id, guild_id) {
    return new Promise(async (resolve, reject) => {
        const query = `
            SELECT SUM(vc_time) AS total_vc_time
            FROM y_guild_users_daily_stats
            WHERE user_id = ? AND guild_id = ?
        `;
        const parameters = [user_id, guild_id];
        const result = await dbquery(query, parameters, db);
        resolve(result[0].total_vc_time)
    })
  }
  
  
  async function getUserMessageCount(db, user_id, guild_id) {
    return new Promise(async (resolve, reject) => {
        const query = `
        SELECT SUM(message_count) AS total_message_count
        FROM y_guild_users_daily_stats
        WHERE user_id = ? AND guild_id = ? AND day >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `;
      const parameters = [user_id, guild_id];
      const result = await dbquery(query, parameters, db);
      resolve(result[0].total_message_count);  
    })
  }

  async function getUserTotalMessageCount(db, user_id, guild_id) {
    return new Promise(async (resolve, reject) => {
        const query = `
        SELECT SUM(message_count) AS total_message_count
        FROM y_guild_users_daily_stats
        WHERE user_id = ? AND guild_id = ?
      `;
      const parameters = [user_id, guild_id];
      const result = await dbquery(query, parameters, db);
      resolve(result[0].total_message_count);  
    })
  }
  
async function getUserActivityForLast7Days(db,userId, guildId) {
    return new Promise(async (resolve, reject) => {
        let activity = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const day = date.toISOString().slice(0, 10);
            const get_stats_query =
            "SELECT * FROM y_guild_users_daily_stats WHERE user_id = ? AND guild_id = ? AND day = ?";
            const parameters = [userId, guildId, day];
            const [stats] = await dbquery(get_stats_query, parameters, db);

            activity.push(
                {
                    day:day,
                    messageCount: stats ? stats.message_count : 0,
                    vcTime: stats ? stats.vc_time : 0
                }
            )
        }
        resolve(activity);
    })
}

async function getAllActivity(db,userId, guildId) {
    return new Promise(async (resolve, reject) => {

        let query = `SELECT DATEDIFF(CURDATE(), MIN(day)) AS days_since_first_activity
                     FROM y_guild_users_daily_stats WHERE user_id = ? AND guild_id = ?`

        let params = [userId,guildId]
        let when_first = await dbquery(query,params,db)

        let how_many_days = when_first[0].days_since_first_activity
        let activity = [];
        const now = new Date();
        for (let i = 0; i <= how_many_days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const day = date.toISOString().slice(0, 10);
            const get_stats_query =
            "SELECT * FROM y_guild_users_daily_stats WHERE user_id = ? AND guild_id = ? AND day = ?";
            const parameters = [userId, guildId, day];
            const [stats] = await dbquery(get_stats_query, parameters, db);

            activity.push(
                {
                    day:day,
                    messageCount: stats ? stats.message_count : 0,
                    vcTime: stats ? stats.vc_time : 0
                }
            )
        }
        resolve(activity);


    })
}