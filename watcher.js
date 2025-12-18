const Abcwager = require('./services/abcwager.js');
const Action = require('./services/action.js');
const Betwindycity = require('./services/betwindycity.js');
const Fesster = require('./services/fesster.js');
const Godds = require('./services/godds.js');
const Highroller = require('./services/highroller.js');

const emojis = require('./constants/emojis.json');

const TelegramBot = require('node-telegram-bot-api');

// Production
const TELEGRAM_TOKEN = "8124439446:AAFsOX3DLoXIBfLkcdzvXOX60H_n2kaAmXw";

// Test
// const TELEGRAM_TOKEN = "8487868778:AAEIpKN3mT2ZDVgg5vPIpPyCNn7mVbHr6Ao";

const chatIdList = ["-1002599703886"]; //"-1002599703886", "7807642696", "7003045533"
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

class Server {
    constructor() {
        this.services = [
            new Godds("anysport247.com"),
        ];
        this.accounts = {
            "1bv": [{ "username": "Tk1519", "password": "vnx25" }],
        };
    }
    init() {
        for (const service of this.services) {
            service.accounts = this.accounts[service.serviceName];
            service.userManager();
        }
        this.handleProcessError();
        this.botRunner();
    }
    handleProcessError() {
        process.on('unhandledRejection', (reason, promise) => {
            console.log(new Date().toLocaleString(), 'Unhandled Rejection at:', promise, 'reason:', reason);
        });
        process.on('uncaughtException', (err) => {
            console.log(new Date().toLocaleString(), 'Uncaught Exception:', err);
        });
        process.on('uncaughtExceptionMonitor', (err) => {
            console.log(new Date().toLocaleString(), 'Uncaught Exception Monitor:', err);
        });
        process.on('rejectionHandled', (promise) => {
            console.log(new Date().toLocaleString(), 'Rejection Handled:', promise);
        });
        process.on('warning', (warning) => {
            console.log(new Date().toLocaleString(), 'Warning:', warning);
        });
    }
    async sendMessageToChannel(msg) {
        for (const chatId of chatIdList) {
            await bot.sendMessage(chatId, msg, { parse_mode: "HTML" });
        }
    }
    async errorHandler(error) {
        console.log(error.message);
    }
    botRunner() {
        bot.on('error', (error) => this.errorHandler(error));
        this.sendMessageToChannel("bot started");
    }
    async main() {
        let ticketIds = [];
        while (1) {
            for (const service of this.services) {
                for (const account of service.accounts) {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        if (!account.playerToken) continue;
                        
                        const openBets = await service.openBets(account.playerToken);
                        
                        if (!openBets) continue;

                        for (const openBet of openBets) {
                            const { TICKET_ID, DESCRIPTION, AMOUNT_TO_RISK, AMOUNT_TO_WIN } = openBet;

                            if (ticketIds.includes(TICKET_ID)) continue;

                            ticketIds.push(TICKET_ID);

                            for (const [emoji, keywords] of Object.entries(emojis)) {
                                if (keywords.some(keyword => new RegExp(keyword, 'i').test(DESCRIPTION[0]))) {
                                    const message = `${emoji} ${DESCRIPTION[0].split("M")[1].trim()} ${AMOUNT_TO_RISK}/${AMOUNT_TO_WIN}`;
                                    console.log(message);
                                    await this.sendMessageToChannel(message);
                                    break;
                                }
                            }
                        }
                    } catch (error) {
                        console.log(this.service.serviceName, account.username, error.message);
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

const server = new Server();
server.init();
server.main();
