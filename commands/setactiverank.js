const {PermissionsBitField} = require('discord.js')
const {ActionRowBuilder , ButtonBuilder ,ButtonStyle ,  ComponentType } = require('discord.js')

module.exports = {
	name: 'setactiverank',
	description: 'Sets a role that every user that was active will be granted with, (every user that is in scoreboard will get this)\n**seactivetrank** <ping_role>',
	type: 'admin',
	async execute(message, args,commands,db,client) {
		
        if (!message.author.bot && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {

            let roleID = ''

            const roleRegex = /^<@&(\d+)>$/;
            if (roleRegex.test(args[0])) {
                const roleId = args[0].match(roleRegex)[1];
                const role = message.guild.roles.cache.get(roleId);
                if (!role) {
                    message.reply('Could not find that role')
                    return
                } else roleID = role.id

            } else {
                message.reply('You did not mention any role')
                return
            }

            let check_if_exists = `SELECT * FROM y_guild_track_users WHERE guild_id = ?`
            let check_params = [message.guild.id]

            let check = await dbquery(check_if_exists,check_params,db)
            
            if(check.length > 0) {

                let check_if_role_for_rank_set = `SELECT * FROM y_guild_activity_rank WHERE guildID = ?`
                let check_params = [message.guild.id]

                console.log(roleID)

                let check = await dbquery(check_if_role_for_rank_set  ,  check_params,db)

                if(check.length > 0) {

                    const buttonRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('agree')
                                .setLabel('Agree')
                                .setStyle('Success'),
                            new ButtonBuilder()
                                .setCustomId('disagree')
                                .setLabel('Disagree')
                                .setStyle('Danger'),
                        );

                    // Send the message with the button row
                    const msg = await message.reply({ 
                        content: 'The rank for active users is currently set, want to change it ?', 
                        components: [buttonRow] 
                    });

                    //////

                    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 })

                    collector.on('collect', async button => {

                        if(button.user.id == message.author.id) {
                            if (button.customId === 'agree') {

                                // let insert_new_rolerank = 'INSERT INTO y_guild_user_ranks (id, role_id, guild_id, rank) VALUES (NULL, ? ,? , ? );'
                                let update_rolerank = 'UPDATE y_guild_activity_rank SET roleID = ? WHERE guildID = ?'
                                let parameters = [roleID , message.guild.id]
                    
                                await dbquery(update_rolerank , parameters,db)

                                msg.edit({
                                    content : `Activity role updated\n<@&${roleID}>`,
                                    components: []
                                })

                            } else if (button.customId === 'disagree') {

                                msg.edit({
                                    content : 'Activity role is how it was before',
                                    components : []
                                })
                            }
                        } else {
                            button.reply({ content: `These buttons aren't for you!`, ephemeral: true });
                        }
                    });

                } else {

                    let insert_new_rolerank = 'INSERT INTO y_guild_activity_rank (id, roleID, guildID) VALUES (NULL ,? ,?);'
                    let parameters = [roleID , message.guild.id]
        
                    await dbquery(insert_new_rolerank,parameters,db)

                    message.reply(`Succesfully set role <@&${roleID}> to active users`)

                }

            } else {
                message.reply('This server is not tracked, enable tracking so this command will be avaiable')
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