const {ActionRowBuilder , ButtonBuilder ,ButtonStyle , ComponentType, EmbedBuilder } = require('discord.js')

module.exports = {
	name: 'ranking',
	description: 'displays server top10 users',
	type: 'public',
	async execute(message, args,commands,db,client) {
		    
        let check_if_exists = `SELECT * FROM y_guild_track_users WHERE guild_id = ?`
        let check_params = [message.guild.id]
        let check = await dbquery(check_if_exists,check_params,db)
        
        if(check.length > 0) {

            let guild_tracking = require('../scripts/guild_tracking')
            let rankings = await guild_tracking.calculate_rankings(message.guild.id,db)

            const PAGE_SIZE = 10; // number of rankings per page
            const pages = Math.ceil(rankings.length / PAGE_SIZE);
            let currentPage = 1;

            const generateEmbed = async (page) => {
                return new Promise((resolve) => {
                    const start = (page - 1) * PAGE_SIZE;
                    const end = page * PAGE_SIZE;
                    const currentRankings = rankings.slice(start, end);

                    const embed = new EmbedBuilder()
                        .setTitle(`${message.guild.name}`)
                        .setDescription(`Showing page ${page} of ${pages}`)
                        .setColor(0x0099FF);

                    currentRankings.forEach(async (rank) => {
                    const member = await client.users.fetch(rank.userID);

                    // console.log(member)
                    if (member) {
                        embed.addFields(
                            { name: `#${rank.rank} ${member.username}`, value: `score: ${rank.score.toFixed(2)}` },
                        )
                    }  else {
                        embed.addFields(
                            { name : `#${rank.rank} Unknown User (ID: ${rank.userID})` , value :` score: ${rank.score.toFixed(2)}`}
                        )
                    }
                    });

                    resolve(embed)
                })
            };

            let row = new ActionRowBuilder()
                .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle('Primary')
                    .setDisabled(currentPage == 1),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle('Primary')
                    .setDisabled(currentPage == pages),
                );

            const messageEmbed = await message.channel.send({ embeds: [await generateEmbed(currentPage)], components: [row] });

            // console.log(row.components)

            const collector = messageEmbed.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 })

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'next') {
                currentPage++;
                } else if (interaction.customId === 'previous') {
                currentPage--;
                }

                const newEmbed = await generateEmbed(currentPage);

                let row = new ActionRowBuilder()
                .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle('Primary')
                    .setDisabled(currentPage == 1),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle('Primary')
                    .setDisabled(currentPage == pages),
                );

                // console.log(newComponents.components)

                await interaction.update({ embeds: [newEmbed], components: [row] });
            });

            collector.on('end', async () => {
                const finalEmbed = await generateEmbed(currentPage);

                let row = new ActionRowBuilder()
                .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle('Primary')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle('Primary')
                    .setDisabled(true),
                );

                await messageEmbed.edit({ embeds: [finalEmbed], components: [row] });
            });


        } else {
            message.reply('This server is not tracked, ask admin to enable tracking on this server')
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