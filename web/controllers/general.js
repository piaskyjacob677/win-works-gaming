const fs = require("fs");
const catchAsync = require("../utils/catchAsync");
const { resolveApp } = require("../utils/path");
const parse = require('../../utils/parse.js');
const { filterEvents, getFinalEvents } = require('../../utils/handler.js');

class GeneralCtr {
    constructor(service) {
        this.service = service;
    }
    async skins(req, res, next) {
        return catchAsync(async (req, res, next) => {
            res.send(this.service.services.map(v => ({
                service: v.serviceName,
                title: v.serviceName
            })))
        })(req, res, next)
    }
    async teams(req, res, next) {
        return catchAsync(async (req, res, next) => {
            const services = {};
            for (const service of this.service.services) {
                const serviceName = service.serviceName;
                const matches = fs.readFileSync(resolveApp(`events/8089/${serviceName}.json`), "utf8");
                services[serviceName] = JSON.parse(matches);
            }
            const teams = filterEvents(req.query.search, services);
            res.send(teams)
        })(req, res, next)
    }
    async bet(req, res, next) {
        return catchAsync(async (req, res, next) => {
            const { betSlip, amount, pointTolerance, oddsTolerance, confirmMode, filterEventsList } = req.body;
            
            const services = {};
            for (const service of this.service.services) {
                const serviceName = service.serviceName;
                const matches = fs.readFileSync(resolveApp(`events/8089/${serviceName}.json`), "utf8");
                services[serviceName] = JSON.parse(matches);
            }

            let finalResults = [];

            const finalEvents = filterEventsList.length > 0 ?
                filterEventsList
                :
                getFinalEvents(betSlip.title, services);

            if (confirmMode) {
                res.send(finalEvents);
                return;
            }
            
            let history = fs.readFileSync(resolveApp(`${process.env.DIR_DATA}/history.json`), "utf8");
            history = JSON.parse(history);
            let totalStake = amount;
            for (const event of finalEvents) {
                if (totalStake <= 0) break;
                const service = this.service.services.find(service => service.serviceName == event.serviceName);
                const results = await service.place(event, totalStake, pointTolerance, oddsTolerance);
                finalResults.push(...results);
                for (const output of results) {
                    const { stake } = output;
                    totalStake -= stake || 0;
                }
                history.push({
                    kind: "Structured",
                    service: service.serviceName,
                    betslips: [event],
                    outputs: results,
                });
            }
            fs.writeFileSync(resolveApp(`${process.env.DIR_DATA}/history.json`), JSON.stringify(history.slice(-100)));
            res.send(finalResults);
        })(req, res, next)
    }
    async getSignals(req, res, next) {
        return catchAsync(async (req, res, next) => {
            // const allMatchesOfAllServices = this.service.services.map(service => Object.keys(service.matches).map(match => ({
            //     service: service.serviceName,
            //     match: match,
            // }))).flat();
            // console.log(allMatchesOfAllServices);
            // res.send(allMatchesOfAllServices);
        })(req, res, next)
    }
    async prebet(req, res, next) {
        return catchAsync(async (req, res, next) => {
            const { input } = req.body;
            let history = fs.readFileSync(resolveApp(`${process.env.DIR_DATA}/history.json`), "utf8");
            history = JSON.parse(history);

            const parsedSignal = parse.main(input);
            let { betTeamName, period, marketName, points, odds, props, stake } = parsedSignal;
            points = points == "pk" ? "pk" : Number(points);

            const inputMsg = `🔥 ${input}\n${betTeamName} ${period} ${marketName} ${points}/${odds} $${stake || 0} ${props ? 'Props' : ''}`.trim();
            let results = { input: inputMsg, betslips: [] };
            let alert = "";
            if (betTeamName == "") alert = "Invalid bet signal. Skipping...";
            if (input.toLowerCase().includes("live")) alert = "Live bets are not supported. Skipping...";
            if (history.find(v => v.kind == "Global" && v.input == input)) alert = "Ticket already placed. Skipping...";
            if (odds == 0) alert = "No odds value given. Skipping...";
            if (props) alert = "Props are not supported. Skipping...";

            if (alert) {
                res.status(400).send(alert);
                return;
            }

            const sport = this.service.services.find(service => service.globalMatches?.[betTeamName]?.[period]?.[marketName])?.globalMatches?.[betTeamName]?.[period]?.[marketName]?.sport;
            stake = stake || 3;
            for (const service of this.service.services) {
                let betslip = service.globalMatches?.[betTeamName]?.[period]?.[marketName];

                if (!betslip) {
                    results.betslips.push({
                        service: service.serviceName,
                        betslip: null,
                        msg: `${service.serviceName}: Bet slip not found for ${betTeamName} ${period} ${marketName}. Skipping...`,
                    });
                    continue;
                }

                if (points == "pk") points = betslip.points;
                if (marketName.includes("to")) points = -points;
                const msg = `${service.serviceName} ${betslip.points}/${betslip.odds} ${betslip.desc}`;
                betslip.serviceName = service.serviceName;
                betslip = { ...betslip, points, odds, stake, originalOdds: betslip.odds, originalPoints: betslip.points };
                results.betslips.push({
                    service: service.serviceName,
                    betslip: betslip,
                    msg: msg,
                });
            }
            res.send({
                ...results,
                betslips: results.betslips
                    .sort((a, b) => (b.betslip?.originalOdds || -999) - (a.betslip?.originalOdds || -999))
                    .sort((a, b) => (b.betslip?.originalPoints || -999) - (a.betslip?.originalPoints || -999))
                    .sort((a, b) => (a.betslip?.order || 0) - (b.betslip?.order || 0))
            });
        })(req, res, next)
    }
    async confirmbet(req, res, next) {
        return catchAsync(async (req, res, next) => {
            const { input, betslips } = req.body;
            if (betslips.length == 0) return res.status(400).send("No betslips provided!");
            let history = fs.readFileSync(resolveApp(`${process.env.DIR_DATA}/history.json`), "utf8");
            history = JSON.parse(history);
            if (history.find(v => v.kind == "Global" && v.input == input)) return res.status(400).send("Input already exists in history!");
            let outputs = [];
            let stake = betslips[0].betslip.stake;
            for (const betslip of betslips) {
                const service = this.service.services.find(service => service.serviceName == betslip.service);
                const tmp = await service.place(betslip.betslip, stake);
                outputs.push(...tmp);
                stake -= outputs.reduce((acc, output) => acc + (output.stake || 0), 0);
                if (stake <= 0) break;
            }
            history.push({
                kind: "Global",
                input: input,
                betslips: betslips,
                outputs: outputs,
            });
            fs.writeFileSync(resolveApp(`${process.env.DIR_DATA}/history.json`), JSON.stringify(history.slice(-100)));
            res.send(outputs);
        })(req, res, next)
    }
    async getHistory(req, res, next) {
        return catchAsync(async (req, res, next) => {
            let history = fs.readFileSync(resolveApp(`${process.env.DIR_DATA}/history.json`), "utf8");
            history = JSON.parse(history);
            res.send(history);
        })(req, res, next)
    }
    async upsertAccount(req, res, next, type) {
        return catchAsync(async (req, res, next) => {
            const account = {
                service: req.body.service,
                username: req.body.username,
                password: req.body.password,
                user_max: req.body.user_max
            };
            let accounts = fs.readFileSync(resolveApp(`${process.env.DIR_DATA}/accounts.json`), "utf8");
            accounts = JSON.parse(accounts);
            let index = accounts[account.service].findIndex(v => v.username.toLowerCase().trim() == account.username.toLowerCase().trim());
            if (type == "create" && index != -1) return res.status(400).send("Account already exists!");
            if (index == -1) accounts[account.service].push(account);
            else accounts[account.service][index] = {
                ...accounts[account.service][index],
                ...account,
            };
            fs.writeFileSync(resolveApp(`${process.env.DIR_DATA}/accounts.json`), JSON.stringify(accounts, null, 2));
            index = this.service.services.find(v => v.serviceName == account.service).accounts.findIndex(v => v.username.toLowerCase().trim() == account.username.toLowerCase().trim());
            if (index == -1) this.service.services.find(v => v.serviceName == account.service).accounts.push(account);
            else this.service.services.find(v => v.serviceName == account.service).accounts[index] = {
                ...this.service.services.find(v => v.serviceName == account.service).accounts[index],
                ...account,
            };
            res.send("Successfully updated account!");
        })(req, res, next)
    }
    async deleteAccount(req, res, next) {
        return catchAsync(async (req, res, next) => {
            const account = req.body;
            let accounts = fs.readFileSync(resolveApp(`${process.env.DIR_DATA}/accounts.json`), "utf8");
            accounts = JSON.parse(accounts);
            accounts[account.service] = accounts[account.service].filter(v => v.username.toLowerCase().trim() != account.username.toLowerCase().trim());
            fs.writeFileSync(resolveApp(`${process.env.DIR_DATA}/accounts.json`), JSON.stringify(accounts, null, 2));
            this.service.services.find(v => v.serviceName == account.service).accounts = accounts[account.service];
            res.send("Successfully deleted account!");
        })(req, res, next)
    }
    async getAccounts(req, res, next) {
        return catchAsync(async (req, res, next) => {
            let accounts = this.service.services.reduce((prev, current) => [...prev, ...current.accounts.map(v => ({ ...v, service: current.serviceName }))], []);
            res.send(accounts);
        })(req, res, next)
    }
}

module.exports = GeneralCtr;
