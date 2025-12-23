const TelegramBot = require('node-telegram-bot-api');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

async function notify(message, chatId) {
    try {
        await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    } catch (error) {
        console.log("Telegram notify error:", error.message);
    }
}

module.exports = { notify };
