module.exports = {
    async message(message,db,client) {
        if(!message.author.bot) {

            try {
                
                //CHECK IF USER WAS TODAY RECORDED ON THIS SERVER

                const date = new Date().toISOString().slice(0, 10);

                let check_if_user_sent_msg_today = 'SELECT * FROM y_guild_users_daily_stats WHERE day = ? AND user_id = ? AND guild_id = ?'
                let check_msg_params = [date,message.author.id,message.guild.id]
                let check_msg = await dbquery(check_if_user_sent_msg_today,check_msg_params,db)

                if(check_msg.length > 0) {

                    // If there is already a row in the database, increment the count
                    const count = check_msg[0].message_count + 1;

                    let update_count = 'UPDATE y_guild_users_daily_stats SET message_count = ? WHERE user_id = ? AND day = ? AND guild_id = ?'
                    let update_params = [count,message.author.id,date,message.guild.id]

                    await dbquery(update_count,update_params,db)

                }
                else {

                    //IF ITS FIRST MESSAGE THAT DAY
                    let create_row_query = 'INSERT INTO y_guild_users_daily_stats (day, message_count, guild_id, user_id) VALUES (?, ?, ?, ?)'
                    let params = [date,1,message.guild.id,message.author.id]
                    await dbquery(create_row_query,params,db)
                }

            } catch (error) {
                if(error) {
                    console.log(error)

                    let config = require('../config.json')
                    client.users.send(config.ownerID,`ERROR PRZY SLEDZIENIU WIADOMOSCI\n${error}`)
                }
            }

            //AFTER A UPDATE OF COUNT, RECALCULATE CURRENT SERVER RANKING 

            this.calculate_rankings(message.guild.id,db)

        }
    },
    async calculate_rankings(guild,db) { //CALCULATES RANKINGS FOR SPECIFIED GUILD

        const guildId = guild
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days

        const avgQuery = `
            SELECT user_id, SUM(message_count) as total_count
            FROM y_guild_users_daily_stats
            WHERE guild_id = ?
            AND day >= ?
            GROUP BY user_id
            ORDER BY total_count DESC
        `;

        const avgParams = [guildId, lastWeek.toISOString().split('T')[0]];
        const avgResult = await dbquery(avgQuery, avgParams, db);

        let ranks = [];

        // Assign ranks based on weekly average message count
        avgResult.forEach((row, index) => {
            const rank = index + 1;
            const userId = row.user_id;
            const messageCount = row.total_count / 7; // average message count per day

            // Store rank in memory for later use

            ranks.push({
                userID : userId,
                rank: rank,
                average: messageCount
            })
        });

        return ranks

        // {
        //     userID: '491588970136862720',
        //     rank: 2,
        //     average: 0.5714285714285714
        // }

    },
    voicechat(userId,guildId,client) {

        //function counts how many time user spend in voicechannel, returns time in seconds
        return new Promise((resolve,reject) => {
            const guild = client.guilds.cache.get(guildId);
            const member = guild.members.cache.get(userId);
          
            if (!member.voice.channel) return;
          
            let timeElapsed = 0
          
            const interval = setInterval(() => {
                timeElapsed += 1
    
                console.log
    
              if(!member.voice.channel) {

                
          
                clearInterval(interval);
                resolve(timeElapsed)

              }
            }, 1000);
        })
    },
    async update_voice(user_id,guild_id,db,time) {
        //CHECK IF USER WAS TODAY RECORDED ON THIS SERVER

        const date = new Date().toISOString().slice(0, 10);

        let check_if_user_was_in_voice = 'SELECT * FROM y_guild_users_daily_stats WHERE day = ? AND user_id = ? AND guild_id = ?'
        let check_voice_params = [date,user_id,guild_id]
        let check_vc = await dbquery(check_if_user_was_in_voice  ,  check_voice_params  ,  db)

        if(check_vc.length > 0) {

            // If there is already a row in the database, increment the time
            const timein = check_vc[0].vc_time + time;

            let update_count = 'UPDATE y_guild_users_daily_stats SET vc_time = ? WHERE user_id = ? AND day = ? AND guild_id = ?'
            let update_params = [timein,user_id,date,guild_id]

            await dbquery(update_count,update_params,db)

        }
        else {

            //IF ITS FIRST MESSAGE THAT DAY
            let create_row_query = 'INSERT INTO y_guild_users_daily_stats (day, vc_time, guild_id, user_id) VALUES (?, ?, ?, ?)'
            let params = [date,time,guild_id,user_id]
            await dbquery(create_row_query,params,db)
        }
    }
}

function dbquery(prompt,variables,db) {
    return new Promise((resolve,reject) => {
        db.query(prompt,variables, function (err,rows){
           if(err) reject(err)
           else resolve(rows)
        })
    })
}