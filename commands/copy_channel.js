const {PermissionsBitField} = require('discord.js')

module.exports = {
	name: 'cpimg',
	description: 'resend current channel images to selected channel\n example use : copy_images <target_channel_id>',
    type : 'admin',
	async execute(message, args,commands,db,client) {
        
		if (!message.author.bot && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {

            let target_channel = await client.channels.cache.get(args[0])

            if(!target_channel) {
                message.reply('Could not find that channel')
                return
            }

            let check_if_exists = `SELECT * FROM y_channel_copy WHERE channel_id = ? AND type = '1'`
            let check_params = [message.channel.id, args[0]]

            let check = await dbquery(check_if_exists,check_params,db)

            console.log(check)
            
            if(check.length > 0) {

                message.reply('This channel is already copied')

            } else {

                try {
                    let insert_new_copies = 'INSERT INTO y_channel_copy (id, user_id, channel_id, target_channel, type) VALUES (NULL, ?, ?, ?, ?);'
                    let parameters = [message.author.id ,message.channel.id, args[0],1]
        
                    let copied_channel_data = await dbquery(insert_new_copies,parameters,db)
                    console.log(`New channel is copying now ${message.channel.id}`)
                    message.reply('Started copying images')
                } catch (error) {
                    if(error){
                        message.reply('error occured while trying to copy this channel')
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