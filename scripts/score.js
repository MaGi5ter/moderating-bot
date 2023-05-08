//here are new score system created, bcs last one is easly abused by simply spending hours afk in voice channel
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();

module.exports = {
    async message(message,db) { //returns a score gained from a message

        function isRepeatedWord(string) {
            const regex = /^(\w+)\1+$/;
            // Test if the string matches the pattern
            return regex.test(string);
        }

        function containsWordsInAnyLanguage(string) {
            return lngDetector.detect(string,1)
        }

        function quadratic(x,target) {
            return ( (-1 * (x*x) + ((target*2) * x )) ) 
        }

        function calculateLevenshteinDistance(str1, str2) {
            const m = str1.length;
            const n = str2.length;
          
            // Create a 2D matrix
            const matrix = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
          
            // Initialize the matrix with values
            for (let i = 0; i <= m; i++) {
              matrix[i][0] = i;
            }
            for (let j = 0; j <= n; j++) {
              matrix[0][j] = j;
            }
          
            // Calculate the Levenshtein distance
            for (let i = 1; i <= m; i++) {
              for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                  matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                  matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1, // Deletion
                    matrix[i][j - 1] + 1, // Insertion
                    matrix[i - 1][j - 1] + 1 // Substitution
                  );
                }
              }
            }
          
            // Return the Levenshtein distance
            return matrix[m][n];
        }

        async function checkUserMessageInLastMinute(userID, timestamp , guild) {
          try {

            let time = timestamp - 1000 * 60 / 2

            let query = `SELECT activity_type FROM y_user_guild_scores WHERE userID = ? AND guildID = ? AND timestamp >= ?`
            let params = [userID,guild,time]

            let result = await dbquery(query,params,db)

            if(result.length > 0) return true
            else return false

            
          } catch (error) {
              console.error('Error occurred while checking user message:', error);
              return false;
          }
        }


        function calculateSimilarity(str1, str2) {
            const distance = calculateLevenshteinDistance(str1, str2);
            const maxLength = Math.max(str1.length, str2.length);
            const similarity = 1 - distance / maxLength;
            return similarity;
        }

        async function isDuplicateMessage(message) {
            try {
              const { author } = message;
              const messages = await message.channel.messages.fetch({ limit: 10 }); // Fetch the last 10 messages in the channel
          
              const recentMessages = messages.filter((msg) => {
                return (
                  msg.author.id === author.id && // Check if the message is sent by the same user
                  msg.createdTimestamp > Date.now() - 5 * 60 * 1000 && // Check if the message is sent within the last 5 minutes
                  calculateSimilarity(msg.content,message.content) > 0.75// msg.content === message.content // Check if the content of the message is the same or at least 80% the same
                );
              });
          
              return recentMessages.size > 1; // Return true if there is at least one duplicate message
            } catch (error) {
              console.error('Error occurred while checking for duplicate message:', error);
              return false; // Return false in case of any error
            }
        }
          
        return new Promise(async (resolve, reject) => {
            let score = 0          

            let lastmin = await checkUserMessageInLastMinute(message.author.id,message.createdTimestamp , message.guild.id )
            
            if(!lastmin) {
              if(!await isDuplicateMessage(message)) {

                let detect_lang = containsWordsInAnyLanguage(message.content)
  
                if(detect_lang.length > 0 && detect_lang[0][1] > 0.15) {
                    let size = message.content.length
                    let words = [...new Set(message.content.trim().split(/ +/))]
                    // console.log(words)
                    words.forEach(word => {
                        if(!isRepeatedWord(word)) {
                            let word_score = quadratic(word.length,16)/1000
  
                            word_score = word_score <= 0 ? word_score = 0.01 : word_score 
  
                            score += word_score
  
                        }
                    })
                    score = score * (quadratic(size,230)/10000/6)
                }
              }
            }
          
            console.log(score)

            resolve(score)
        })

    },
    async save(db, guildID , userID , score , activity_type , additional_json_info = {} ) {

      let timestamp = Date.now()
      additional_json_info = JSON.stringify(additional_json_info)

      let create_row_query = 'INSERT INTO y_user_guild_scores (timestamp, guildID, userID, score, activity_type, json_info) VALUES (?, ?, ?, ?, ?, ?)'
      let params = [timestamp, guildID, userID, score , activity_type , additional_json_info]
      await dbquery(create_row_query,params,db)

    },
    async top_score(guild,db) { //CALCULATES RANKINGS FOR SPECIFIED GUILD

      return new Promise(async (resolve,reject) => {
          try {
              
              const guildId = guild

              let date_7days = Date.now() - 1000 * 60 * 60 * 24 * 7

              const guild_top = ` SELECT userID, SUM(score) AS score FROM y_user_guild_scores WHERE guildID = ? AND timestamp >= ? GROUP BY userID ORDER BY score DESC`;
              const params = [guildId,date_7days];

              const guildQuery = await dbquery(guild_top, params, db);

              let users_scores = [];

              guildQuery.forEach((user,index) => {

                users_scores.push({
                  userID : user.userID,
                  score : user.score,
                  rank: index + 1
                })
                  
              })

              resolve(users_scores)

          } catch (error) {
              if(error) {
                  console.log(error)
              }
          }
      })

  },
}

function dbquery(prompt,variables = [],db) {
  return new Promise((resolve,reject) => {
      db.query(prompt,variables, function (err,rows){
         if(err) reject(err)
         else resolve(rows)
      })
  })
}