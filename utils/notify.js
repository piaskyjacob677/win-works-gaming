const TelegramBot = require('node-telegram-bot-api');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const users = process.env.USERS.split(',');

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

function notify(message) {
    for (const user of users) {
        bot.sendMessage(user, message, { parse_mode: "HTML" })
            .catch(error => console.log("Telegram notify error:", error.message));
    }
}

module.exports = { notify };
