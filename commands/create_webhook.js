const {PermissionsBitField} = require('discord.js')

module.exports = {
	name: 'create_webhook',
	description: 'creates webhook bcs sometime its needed to create webhook as bot',
    type : 'admin',
	execute(message, args) {

        if (!message.author.bot && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            message.channel.createWebhook({
                name: 'edit_this',
            })
                .then(webhook => {
                    message.author.send(webhook.url)
                    console.log(`Created webhook ${webhook.url}`)
                })
                .catch(console.error);
        }
	},
};