const {PermissionsBitField} = require('discord.js')
const {ActionRowBuilder , ButtonBuilder ,ButtonStyle ,  ComponentType } = require('discord.js')

module.exports = {
	name: 'setrank',
	description: 'allows admin to set wchich ranks is granted to user when he gets specific rank in server activity ranking\n**setrank** <rank_number> <ping_role>',
	type: 'admin',
	async execute(message, args,commands,db,client) {
		
        if (!message.author.bot && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {

            const str = args[0];
            if (isNaN(str)) {
                message.reply('Rank needs to be a number')
                return
            }

            let rank = str
            let roleID = ''

            const roleRegex = /^<@&(\d+)>$/;
            if (roleRegex.test(args[1])) {
                const roleId = args[1].match(roleRegex)[1];
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

                let check_if_role_for_rank_set = `SELECT * FROM y_guild_user_ranks WHERE guild_id = ?  AND rank = ?`
                let check_params = [message.guild.id, rank]

                console.log(rank, roleID)

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
                        content: 'This rank has currently set a role do you want to edit it for your selected ?', 
                        components: [buttonRow] 
                    });

                    // Create a button collector
                    // const collector = msg.createMessageComponentCollector({ time: 10000 });
                    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 })

                    collector.on('collect', async button => {

                        if(button.user.id == message.author.id) {
                            if (button.customId === 'agree') {

                                // let insert_new_rolerank = 'INSERT INTO y_guild_user_ranks (id, role_id, guild_id, rank) VALUES (NULL, ? ,? , ? );'
                                let update_rolerank = 'UPDATE y_guild_user_ranks SET role_id = ? WHERE guild_id = ? AND rank = ?'
                                let parameters = [roleID , message.guild.id , rank]
                    
                                await dbquery(update_rolerank , parameters,db)


                                msg.edit({
                                    content : `Rank role updated\n<@&${roleID}> to rank **${rank}**`,
                                    components: []
                                })

                            } else if (button.customId === 'disagree') {

                                msg.edit({
                                    content : 'Rank role is how it was before',
                                    components : []
                                })
                            }
                        } else {
                            button.reply({ content: `These buttons aren't for you!`, ephemeral: true });
                        }
                    });

                } else {

                    let insert_new_rolerank = 'INSERT INTO y_guild_user_ranks (id, role_id, guild_id, rank) VALUES (NULL, ? ,? , ? );'
                    let parameters = [roleID , message.guild.id , rank]
        
                    await dbquery(insert_new_rolerank,parameters,db)

                    message.reply(`Succesfully set role <@&${roleID}> to rank ${rank} user`)

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