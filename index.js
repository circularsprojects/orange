const Discord = require('discord.js');
const fs = require('fs');
const http = require('https');
const env = require('dotenv').config();
var blacklist = fs.readFileSync('blacklist.txt', 'utf8').split('\n');
// when blacklist.txt gets updated, read the file again
fs.watchFile('blacklist.txt', () => {
    blacklist = fs.readFileSync('blacklist.txt', 'utf8').split('\n');
});

var overlord = fs.readFileSync('overlord.txt', 'utf8');
fs.watchFile('overlord.txt', () => {
    overlord = fs.readFileSync('overlord.txt', 'utf8');
});
var cooldowns = {
    "example_id": 0 // unix millis when cooldown started
}

const client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        // voice chat
        Discord.Intents.FLAGS.GUILD_VOICE_STATES,
        // message
        Discord.Intents.FLAGS.GUILD_MESSAGES
    ]
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // set activity as "Listening to !cmds"
    client.user.setActivity('!cmds', { type: 'LISTENING' });
});

client.on('messageCreate', message => {
    switch (message.content.split(" ")[0]) {
        case "!blacklist":
            if (message.author.id == overlord) {
                let id = message.content.split(" ")[1];
                if (id == undefined) {
                    message.channel.send("Please specify a user ID");
                } else {
                    if (blacklist.includes(id)) {
                        message.channel.send("User is already blacklisted");
                    } else {
                        blacklist.push(id);
                        fs.writeFileSync('blacklist.txt', blacklist.join('\n'));
                        message.channel.send("User blacklisted");
                    }
                }
            } else {
                message.channel.send("You are not the overlord! Use !challenge to try to become the overlord.");
            }
            break;
        case "!unblacklist":
            if (message.author.id == overlord) {
                let id = message.content.split(" ")[1];
                if (id == undefined) {
                    message.channel.send("Please specify a user ID");
                } else {
                    if (blacklist.includes(id)) {
                        blacklist.splice(blacklist.indexOf(id), 1);
                        fs.writeFileSync('blacklist.txt', blacklist.join('\n'));
                        message.channel.send("User unblacklisted");
                    } else {
                        message.channel.send("User is not blacklisted");
                    }
                }
            } else {
                message.channel.send("You are not the overlord! Use !challenge to try and become the overlord.");
            }
            break;
        case "!challenge":
            if (message.author.id == overlord) {
                message.channel.send("You're already the overlord!");
                return;
            }
            if (cooldowns[message.author.id] != undefined) {
                // check if it has been 10 minutes since the cooldown
                if (cooldowns[message.author.id] + 600000 > Date.now()) {
                    message.channel.send("You're still on cooldown!");
                    return;
                } else {
                    // remove cooldown
                    delete cooldowns[message.author.id];
                }
            }
            // send a GET request to https://opentdb.com/api.php?amount=1&category=9&difficulty=medium&type=multiple
            // ignore blacklists, but only accept responses from the user who sent the command
            // listen for messages using a message collector for 10 seconds
            http.get('https://opentdb.com/api.php?amount=1&category=9&difficulty=medium&type=multiple', (resp) => {
                let data = '';
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                resp.on('end', () => {
                    let question = JSON.parse(data).results[0];
                    let answers = question.incorrect_answers;
                    answers.push(question.correct_answer);
                    answers.sort();
                    let answer = answers.indexOf(question.correct_answer);
                    message.channel.send(question.question + "\n" + answers.map((a, i) => `${i + 1}. ${a}`).join("\n") + "\n\nYou have 10 seconds to answer.\nAnswer by saying the correct number.");
                    const filter = m => m.author.id == message.author.id;
                    const collector = message.channel.createMessageCollector({ filter, time: 10000 });
                    collector.on('collect', m => {
                        if (m.content == answer + 1) {
                            message.channel.send("Correct!\nYou are now the overlord of the bot, and possess the ability to blacklist people to prevent them from joining vc lmao");
                            overlord = m.author.id;
                            fs.writeFileSync('overlord.txt', overlord);
                            collector.stop();
                        } else {
                            message.channel.send("Incorrect!\nYou have been put on cooldown for 10 minutes.");
                            cooldowns[m.author.id] = Date.now();
                            collector.stop();
                        }
                    });
                    collector.on('end', collected => {
                        if (collected.size == 0) {
                            message.channel.send("Time's up!");
                        }
                    });
                });
            }).on("error", (err) => {
                console.log("Error: " + err.message);
            });
            break;
        case "!cmds":
            message.channel.send("Commands:\n\`!blacklist <user id>\` - blacklists a user\n\`!unblacklist <user id>\` - unblacklists a user\n\`!challenge\` - challenge to become the overlord\n\`!cmds\` - shows this message\n\`!overlord\` - shows the current overlord\n\`!list\` - shows the blacklist");
            break;
        case "!overlord":
            message.guild.members.fetch(overlord).then(user => {
                message.channel.send(`The current overlord is ${user.user.tag}`);
            }).catch(err => {
                message.channel.send("The current overlord is uh.... huh.\nApparently there isn't an overlord....\n\`CACHED OVERLORD ID: " + overlord + "\`")
            });
            break;
        case "!list":
            if (blacklist.length == 0) {
                message.channel.send("The blacklist is empty");
            } else {
                let list = "";
                var count = 0
                for (let i = 0; i < blacklist.length; i++) {
                    message.guild.members.fetch(blacklist[i]).then(user => {
                        list += `${user.user.tag}\n`;
                        count++;
                        if (count == blacklist.length) {
                            message.channel.send("Blacklist: ```" + list + "```");
                        }
                    }).catch(err => {
                        list += `\`ID: ${blacklist[i]}\`\n`;
                    });
                }
            }
            break;
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    // check if newState.member.user.id is in blacklist
    if (blacklist.includes(newState.member.user.id)) {
        newState.disconnect("pranjked lmao");
    }
});

client.login(process.env['TOKEN']);