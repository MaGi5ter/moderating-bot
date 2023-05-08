const {ActionRowBuilder , ButtonBuilder ,ButtonStyle , ComponentType, EmbedBuilder } = require('discord.js')

module.exports = {
	name: 'top',
	description: 'displays server top players based on their score from last week',
	type: 'public',
	async execute(message, args,commands,db,client) {
		    
        let check_if_exists = `SELECT * FROM y_guild_track_users WHERE guild_id = ?`
        let check_params = [message.guild.id]
        let check = await dbquery(check_if_exists,check_params,db)
        
        if(check.length > 0) {

            let score = require('../scripts/score')
            let rankings = await score.top_score(message.guild.id,db)

            console.log(rankings)

            const PAGE_SIZE = 10; // number of rankings per page
            const pages = Math.ceil(rankings.length / PAGE_SIZE);
            let currentPage = 1;

            const generateEmbed = async (page) => {
                return new Promise((resolve) => {
                    const start = (page - 1) * PAGE_SIZE;
                    const end = page * PAGE_SIZE;
                    const currentRankings = rankings.slice(start, end);

                    // let description = "```\nTop users based on their score\n```\n  **1**. <@123>  `16.02`\n  **2**. <@123>  `12.02`\n  **3**. <@123>  `11.02`\n  **4**. <@123>  `8.02`"
                    let description = "```\nTop users based on their score\n```"

                    currentRankings.forEach(async (rank,index) => {
                        description = description + `\n  **${index + 1}**. <@${rank.userID}>  ` + '`' + rank.score.toFixed(2) + '`'
                    });

                    const embed = new EmbedBuilder()
                        .setTitle(`${message.guild.name}`)
                        .setDescription(description)
                        .setColor("#9a54c0");

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