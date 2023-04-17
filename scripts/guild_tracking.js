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

            // this.calculate_rankings(message.guild.id,db)

        }
    },
    async calculate_rankings(guild,db) { //CALCULATES RANKINGS FOR SPECIFIED GUILD

        return new Promise(async (resolve,reject) => {
            try {
                
                const guildId = guild

                const guild_stats_query = `
                SELECT 
                    user_id, 
                    SUM(vc_time) AS total_vc_time, 
                    SUM(message_count) AS total_message_count,
                    COUNT(DISTINCT day) AS active_days
                FROM y_guild_users_daily_stats 
                WHERE guild_id = ? 
                    AND day >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
                GROUP BY user_id 
                ORDER BY total_message_count DESC
                `;

                const query_params = [guildId];
                const guildQuery = await dbquery(guild_stats_query, query_params, db);

                let users_scores = [];

                guildQuery.forEach((user) => {

                    let avgMSG = (user.total_message_count / 7).toFixed(2)
                    let avgVC  = (user.total_vc_time / 60 / 7).toFixed(2)
                    let actDAY = user.active_days

                    let score = 
                    (
                        (
                            Number(avgMSG) + (Number(avgVC)*0.5)
                        )/2
                    ) * (
                            Number(actDAY) / 1.3
                        )


                    users_scores.push({
                        userID : user.user_id,
                        score: score
                    })


                })

                const ranked_users = users_scores.sort((a, b) => b.score - a.score).map((user, index) => {
                    return {
                        userID: user.userID,
                        score: user.score,
                        rank: index + 1
                    };
                });

                resolve(ranked_users)

            } catch (error) {
                if(error) {
                    reject('err')
                }
            }
        })

    },
    getInactiveUsers(guildId, db) {
        return new Promise(async (resolve, reject) => {
          try {
            const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days
            const inactiveQuery = `
              SELECT DISTINCT user_id
              FROM y_guild_users_daily_stats
              WHERE guild_id = ?
              AND day < ?
            `;
            const inactiveParams = [guildId, lastWeek.toISOString().split('T')[0]];
            const inactiveResult = await dbquery(inactiveQuery, inactiveParams, db);
            const inactiveUsers = inactiveResult.map(row => row.user_id);
            resolve(inactiveUsers);
          } catch (error) {
            reject([]);
          }
        });
    },
    voicechat(userId,guildId,client,db) {

        //function counts how many time user spend in voicechannel, returns time in seconds
        return new Promise((resolve,reject) => {
            const guild = client.guilds.cache.get(guildId);
            const member = guild.members.cache.get(userId);
          
            if (!member.voice.channel) return;
          
            let timeElapsed = 0
            let timeTotal = 0
          
            const interval = setInterval(() => {
                if(!member.voice.mute) {
                    timeElapsed  +=  1
                    timeTotal    +=  1

                    if(timeElapsed == 30) {
                        this.update_voice(userId,guildId,db,30)
                        timeElapsed = 0
                        // console.log(timeElapsed)
                    }
                }
    
                if(!member.voice.channel) {

                    // console.log(timeElapsed)

                    this.update_voice(userId,guildId,db,timeElapsed)

                    clearInterval(interval)
                    resolve(timeTotal)
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

        // console.log('time update')

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
    },
    async rankUpdates(db,client) {

        console.log('Rank Updates')

        let get_guild_list = 'SELECT * FROM y_guild_track_users'
        let guild_list = await dbquery(get_guild_list,undefined,db)

        for (const guild_ of guild_list) {

            const guild = client.guilds.cache.get(guild_.guild_id);
            if(!guild) continue


            let ranks = await this.calculate_rankings(guild.id,db)

            let guild_roles_query = 'SELECT * FROM y_guild_user_ranks WHERE guild_id = ?'
            let parameters = [guild.id]
            let guild_rank_roles = await dbquery(guild_roles_query , parameters , db)

            ranks.forEach(async (rank) => {

                const role = guild_rank_roles.find(r => r.rank === rank.rank);
                if (role) {

                    const member = await guild.members.fetch(rank.userID);
                    if (!member) return 

                    const role_to_add = guild.roles.cache.get(role.role_id);
                    if (!role_to_add) return 

                    // console.log(role_to_add.id)

                    guild_rank_roles.forEach(role => {
                        if (member.roles.cache.has(role.role_id) && role.role_id != role_to_add.id) {
                            member.roles.remove(role.role_id)
                                .catch(error => console.log(`Failed to remove role ${role.role_id} from user ${member.id} in guild ${guild.id}: ${error.message}`));
                        }
                    })

                    await member.roles.add(role_to_add)
                    .catch(error => console.log(`Failed to add role ${role.role_id} to user ${member.id} in guild ${guild.id}: ${error.message}`));


                    // console.log(role.role_id);
                } 
            })

            let inactive_check = await this.getInactiveUsers(guild_.guild_id,db)
            inactive_check.forEach( async (id) => {
                const member = await guild.members.fetch(id);
                if (!member) return

                guild_rank_roles.forEach(role => {
                    if (member.roles.cache.has(role.role_id)) {
                        member.roles.remove(role.role_id)
                    }
                })
            })
        }
        
        // console.log(guild_list)
    },
}

function dbquery(prompt,variables = [],db) {
    return new Promise((resolve,reject) => {
        db.query(prompt,variables, function (err,rows){
           if(err) reject(err)
           else resolve(rows)
        })
    })
}