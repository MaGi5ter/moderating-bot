const fs        = require("fs")
const https     = require('https')
const {ActionRowBuilder , ButtonBuilder ,ButtonStyle} = require('discord.js')

module.exports = {
    async copy_check(message,db,client) {

        let quer = `SELECT * FROM y_channel_copy WHERE channel_id =  ?`
        let params = [message.channel.id]

        let copy_type = await dbquery(quer , params , db)

        if(copy_type[0].type == 1) this.copy_images(message,db,client,copy_type[0].target_channel)


    },
    async copy_images(message,db,client,target) {

        let Attachments = Array.from(message.attachments.values())
        // console.log(Attachments.length)

        let links = []

        const args = message.content.trim().split(/ +/);
        for (const i of args) {
            if(!i.startsWith('http')) continue
            if(isFile(i)) {
                links.push(i)
            }
        }

        if(links.length > 0 || Attachments.length > 0) {

            let message_content = `**${message.author.username}** sent:\n`
            if(links.length > 0) {
                links.forEach((link) => {
                    message_content = `${message_content} ${link} \n`
                })
            }

            let attachments = []
            const max_size  = 8388608 //8MB CURRENT DISCORD LIMIT

            for (const attachment of Attachments) {

                if(attachment.size > max_size) {
                    message_content = `${message_content} ${attachment.attachment} \n`
                } else {
                    let file = await download(`${attachment.id}_${attachment.name}`,attachment.attachment)
                    if(file == 'err') continue
                    else {
                        attachments.push({
                            attachment: file.path
                        })
                    }
                }
            }

            let target_channel = await client.channels.cache.get(target)
            let messageLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setEmoji("➡️")
                        .setStyle(ButtonStyle.Link)
                        .setURL(messageLink),
                );

            target_channel.send({
                content: message_content,
                files : attachments,
                components: [row]
            }).then(() => {

                attachments.forEach((file) => {
                    fs.unlink(file.attachment, (err) => {
                        if (err) {
                          console.log(err)
                          return;
                        }
                      });
                })
            })
        }
    },
}

function dbquery(prompt,variables,db) {
    return new Promise((resolve,reject) => {
        db.query(prompt,variables, function (err,rows){
           if(err) reject(err)
           else resolve(rows)
        })
    })
}

function isFile(url) {
    return /\.(jpg|jpeg|png|webp|mp4|mp3|avif|gif|svg)$/.test(url);
}

async function download(filename , url) {
    return new Promise((resolve, reject) => {
      try {
        const file = fs.createWriteStream(`./temporary_files/${filename}`);
        https.get(url, function(response) {
          response.pipe(file);
          // after download completed close filestream
          file.on("finish", () => {
              file.close();
            //   console.log("Download Completed");
              resolve(file)
          });
        }); 
      } catch (error) {
        if(error) {
          console.log(error)
          reject('err')
        }
      }
    })
  }