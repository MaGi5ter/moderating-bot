const {PermissionsBitField} = require('discord.js')
const config = require('../config.json')

module.exports = {
	name: 'help',
	description: 'command to send every loaded command with description',
	type: "public",
	execute(message, args,commands) {


		let command_list_message = ``

        commands.forEach(element => {
			if(message.author.id == config.ownerID) {
				command_list_message = `${command_list_message}**${element.name}**\n${element.description}\n\n`

			} else if(message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
				if(element.type == 'public' || element.type == 'admin') {
					command_list_message = `${command_list_message}**${element.name}**\n${element.description}\n\n`
				}
			}
			else {
				if(element.type == 'public') {
					command_list_message = `${command_list_message}**${element.name}**\n${element.description}\n\n`
				}
			}


        });

        message.author.send(command_list_message)

	},
};