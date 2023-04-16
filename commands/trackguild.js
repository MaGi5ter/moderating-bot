const {PermissionsBitField} = require('discord.js')

module.exports = {
	name: 'trackguild',
	description: 'add current guild to statistics and user activities tracking',
    type : 'admin',
	async execute(message, args,commands,db) {
        
		if (!message.author.bot && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {

            let check_if_exists = `SELECT * FROM y_guild_track_users WHERE guild_id = ?`
            let check_params = [message.guild.id]

            let check = await dbquery(check_if_exists,check_params,db)
            
            if(check.length > 0) {

                message.reply('This server is alredy tracked')

            } else {

                try {
                    let insert_new_user = 'INSERT INTO y_guild_track_users (id, guild_id, user_id, username) VALUES (NULL, ?,?,?);'
                    let parameters = [message.guild.id,message.author.id,message.author.username]
        
                    let user_data = await dbquery(insert_new_user,parameters,db)
                    console.log(`New Server added ${message.guild.id}`)
                    message.reply('Started tracking')
                } catch (error) {
                    if(error){
                        message.reply('error occured while adding this guild')
                        console.log(error)
                    }
                }
            }
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