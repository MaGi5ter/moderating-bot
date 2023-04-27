const {PermissionsBitField} = require('discord.js')
const {ActionRowBuilder , ButtonBuilder ,ButtonStyle ,  ComponentType } = require('discord.js')

module.exports = {
	name: 'excludechannel',
	description: 'excludes channel from using commands so users without admin permissons would not be allowed to use commands',
    type : 'admin',
	async execute(message, args,commands,db) {

        if (!message.author.bot && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {

            let channelID = message.channel.id
            
            let check_query = 'SELECT * FROM y_excluded_channels WHERE channel_id = ?'
            let params = [channelID]

            let check = await dbquery(check_query,params,db)

            if(check.length > 0) {

                const buttonRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('agree')
                            .setLabel('Yes')
                            .setStyle('Success'),
                        new ButtonBuilder()
                            .setCustomId('disagree')
                            .setLabel('No')
                            .setStyle('Danger'),
                    );

                // Send the message with the button row
                const msg = await message.reply({ 
                    content: 'Commands on this channel are disabled, want to enable ?', 
                    components: [buttonRow] 
                });

                const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 })

                collector.on('collect', async button => {

                    if(button.user.id == message.author.id) {
                        if (button.customId === 'agree') {
                            
                            let delete_excluded = 'DELETE FROM y_excluded_channels WHERE channel_id = ?'
                            let parameters = [channelID]
                
                            await dbquery(delete_excluded , parameters,db)

                            msg.edit({
                                content : `Commands on this channel enabled`,
                                components: []
                            })

                        } else if (button.customId === 'disagree') {

                            msg.edit({
                                content : 'Still disabled',
                                components : []
                            })
                        }
                    } else {
                        button.reply({ content: `These buttons aren't for you!`, ephemeral: true });
                    }
                });


            } else {

                let add_query = 'INSERT INTO y_excluded_channels (id, channel_id) VALUES (NULL, ?)'
                let params = [channelID]

                await dbquery(add_query,params,db).then(e =>{
                    message.reply('Channel excluded')
                })
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