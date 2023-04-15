//https://discord.com/api/oauth2/authorize?client_id=944152616974319637&permissions=8&scope=bot

module.exports = {
	name: 'invitebot',
	description: 'send link with bot invite',
	type: 'public',
	execute(message, args) {
		message.author.send('https://discord.com/api/oauth2/authorize?client_id=944152616974319637&permissions=8&scope=bot')
	},
};