const Discord = require('discord.js');
const fs = require('fs');
const env = require('dotenv').config();
var blacklist = fs.readFileSync('blacklist.txt', 'utf8').split('\n');
// when blacklist.txt gets updated, read the file again
fs.watchFile('blacklist.txt', () => {
    blacklist = fs.readFileSync('blacklist.txt', 'utf8').split('\n');
});
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
  // set activity as invisible
    client.user.setPresence({
        status: 'invisible'
    });
});

client.on('messageCreate', message => {
    switch (message.content.split(" ")[0]) {
        case "!blacklist":
            if (message.author.id == "305243321784336384") {
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
            }
            break;
        case "!unblacklist":
            if (message.author.id == "305243321784336384") {
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
            }
            break;
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    // check if newState.member.user.id is in blacklist
    if (blacklist.includes(newState.member.user.id)) {
        newState.disconnect("gay lmao");
    }
});

client.login(process.env['TOKEN']);