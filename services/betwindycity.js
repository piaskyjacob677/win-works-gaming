const fs = require("fs");
const fetch = require("node-fetch");
const { leagueNameCleaner, getPeriod, getFullName, teamNameCleaner, playerPropsCleaner, toleranceCheck, prettyLog } = require("../utils/utils.js");
const { resolveApp } = require("../web/utils/path.js");
const { HttpsProxyAgent } = require('https-proxy-agent');
const { notify } = require("../utils/notify.js");

class Betwindycity {
    constructor() {
        this.serviceName = "betwindycity";
        this.hasRotNumber = false;
        this.isReady = false;
        this.matches = {};
        this.accounts = [];
    }
    async getLeagues(token, agent) {
        let leagues = [];
        try {
            const response = await fetch("https://betwindycity.com/player-api/api/wager/sportsavailablebyplayeronleague/false", {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${token}`,
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "Referer": "https://betwindycity.com/v2/"
                },
                "body": null,
                "method": "GET"
            });

            const data = await response.json();

            const preLeagues = Object.keys(data.Items).flatMap(v => {
                return data.Items[v].items.map(w => {
                    return {
                        id: data.Items[v].IdLeague,
                        sport: v,
                        IdSportType: w.CombinedItems[0].IdSportType,
                        SportSubType: w.SportSubType,
                        SportType: w.SportType,
                        PeriodDescription: w.PeriodDescription,
                        PeriodNumber: w.PeriodNumber,
                        EventId: w.EventId,
                    }
                })
            });

            for (const league of preLeagues) {
                const { id, IdSportType, PeriodNumber } = league;
                const result = leagueNameCleaner(league.sport, league.SportSubType + " " + league.PeriodDescription);
                if (!result) continue;
                leagues.push({ id, IdSportType, PeriodNumber, ...result })
            }

        } catch (error) {
            console.log(this.serviceName, error);
        }
        return leagues;
    }
    getBestLine(lines) {
        if (!lines) return null;
        let bestLine = { o: 999 };
        for (const line of lines) {
            if (Math.abs(line.o + 110) < Math.abs(bestLine.o + 110)) bestLine = line;
        }
        return bestLine?.i;
    }
    async getLeagueMatches(league, token, agent) {
        try {
            const { id, IdSportType, PeriodNumber, sport, desc } = league;
            let index = `${id}${IdSportType}${PeriodNumber}`;

            const response = await fetch("https://betwindycity.com/player-api/api/wager/schedules/S/0", {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${token}`,
                    "content-type": "application/json",
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "Referer": "https://betwindycity.com/v2/"
                },
                "body": JSON.stringify([{ "IdSport": IdSportType, "Period": PeriodNumber }]),
                "method": "POST"
            });

            const data = await response.json();
            const limits = data[0]?.sc?.lmt;
            const ps = data[0]?.sc?.ps;
            let games = data[0]?.sc?.schl.flatMap(v => v.g.map(w => w.ts));
            games = games.map(v => {                
                return {
                    team1: ps == ""? v[0]?.n : ps + " " + v[0]?.n,
                    team2: ps == ""? v[1]?.n : ps + " " + v[1]?.n,
                    sprd1: this.getBestLine(v[0]?.ls?.s),
                    sprd2: this.getBestLine(v[1]?.ls?.s),
                    to: this.getBestLine(v[0]?.ls?.t),
                    tu: this.getBestLine(v[0]?.ls?.t),
                    ml1: v[0]?.ls?.m[0]?.i,
                    ml2: v[1]?.ls?.m[0]?.i,
                    draw: v[2]?.ls?.m[0]?.i,
                    tto1: v[0]?.ls?.to[0]?.i,
                    ttu1: v[0]?.ls?.tu[0]?.i,
                    tto2: v[1]?.ls?.to[0]?.i,
                    ttu2: v[1]?.ls?.tu[0]?.i,
                }
            });
            
            for (const gm of games) {
                let team1 = gm.team1;
                let team2 = gm.team2;
                let is_props = new RegExp("player props", "i").test(desc);
                if (is_props) {
                    if (new RegExp("most", "i").test(team1 + " " + team2)) continue;
                    
                    team1 = playerPropsCleaner(sport, team1);
                    team2 = playerPropsCleaner(sport, team2);
                }
                else {
                    team1 = teamNameCleaner(team1);
                    team2 = teamNameCleaner(team2);
                    team1 = getFullName(sport, team1) || team1;
                    team2 = getFullName(sport, team2) || team2;
                }

                const period = getPeriod(sport + " " + desc + " " + gm.team1 + " " + gm.team2);
                const order = period.startsWith("1") ? 1000 : period.startsWith("2") ? 2000 : period.startsWith("3") ? 3000 : period.startsWith("4") ? 4000 : 0;
                
                const base = { sport, desc, idlg: id, hasRotNumber: this.hasRotNumber, is_props };

                if (gm.ml1) {
                    const odds = Number(gm.ml1.split("_")[3]);
                    const limit = limits?.m;
                    const keyName = `${sport} [#${index}] ${team1} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.ml1, points: 0, odds, limit, suffix, order: order + 0 };
                }
                if (gm.ml2) {
                    const odds = Number(gm.ml2.split("_")[3]);
                    const limit = limits?.m;
                    const keyName = `${sport} [#${index}] ${team2} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.ml2, points: 0, odds, limit, suffix, order: order + 1 };
                }
                if (gm.sprd1) {
                    const points = Number(gm.sprd1.split("_")[2]);
                    const odds = Number(gm.sprd1.split("_")[3]);
                    const limit = limits?.s;
                    const keyName = `${sport} [#${index}] ${team1} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.sprd1, points, odds, limit, suffix, order: order + 2 };
                }
                if (gm.sprd2) {
                    const points = Number(gm.sprd2.split("_")[2]);
                    const odds = Number(gm.sprd2.split("_")[3]);
                    const limit = limits?.s;
                    const keyName = `${sport} [#${index}] ${team2} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.sprd2, points, odds, limit, suffix, order: order + 3 };
                }
                if (gm.tto1) {
                    const points = Number(gm.tto1.split("_")[2]);
                    const odds = Number(gm.tto1.split("_")[3]);
                    const limit = limits?.tt;
                    const keyName = `${sport} [#${index}] ${team1} ${period} tto`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.tto1, points: -points, odds, limit, suffix, order: order + 4 };
                }
                if (gm.ttu1) {
                    const points = Number(gm.ttu1.split("_")[2]);
                    const odds = Number(gm.ttu1.split("_")[3]);
                    const limit = limits?.tt;
                    const keyName = `${sport} [#${index}] ${team1} ${period} ttu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.ttu1, points, odds, limit, suffix, order: order + 5 };
                }
                if (gm.tto2) {
                    const points = Number(gm.tto2.split("_")[2]);
                    const odds = Number(gm.tto2.split("_")[3]);
                    const limit = limits?.tt;
                    const keyName = `${sport} [#${index}] ${team2} ${period} tto`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.tto2, points: -points, odds, limit, suffix, order: order + 4 };
                }
                if (gm.ttu2) {
                    const points = Number(gm.ttu2.split("_")[2]);
                    const odds = Number(gm.ttu2.split("_")[3]);
                    const limit = limits?.tt;
                    const keyName = `${sport} [#${index}] ${team2} ${period} ttu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.ttu2, points, odds, limit, suffix, order: order + 5 };
                }
                if (gm.draw) {
                    const odds = Number(gm.draw.split("_")[3]);
                    const limit = limits?.m;
                    const keyName = `${sport} [#${index}] ${team1} : ${team2} draw`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.draw, points: 0, odds, limit, suffix, order: order + 6 };
                }
                if (gm.to) {
                    const points = Number(gm.to.split("_")[2]);
                    const odds = Number(gm.to.split("_")[3]);
                    const limit = limits?.t;
                    const title = gm.team1 == gm.team2 ? team1 : `${team1} : ${team2}`;
                    const keyName = `${sport} [#${index}] ${title} to`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.to, points: -points, odds, limit, suffix, order: order + 7 };
                }
                if (gm.tu) {
                    const points = Number(gm.tu.split("_")[2]);
                    const odds = Number(gm.tu.split("_")[3]);
                    const limit = limits?.t;
                    const title = gm.team1 == gm.team2 ? team1 : `${team1} : ${team2}`;
                    const keyName = `${sport} [#${index}] ${title} tu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.tu, points, odds, limit, suffix, order: order + 8 };
                }
            }
            
            console.log(prettyLog(this.serviceName, sport, desc, games.length));
            return true;

        } catch (error) {
            console.log(this.serviceName, error, league);
        }
    }
    async userLogin(account, agent) {
        try {
            const response = await fetch("https://betwindycity.com/player-api/identity/CustomerLoginRedir?RedirToHome=1", {
                "agent": agent,
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "Referer": "https://betwindycity.com/"
                },
                "body": `customerid=${account.username}&password=${account.password}&submit2=Login`,
                "method": "POST",
                "redirect": "manual"
            });

            const { location } = response.headers.raw();
            const token = location[0].split("=")[1];

            const response2 = await fetch("https://betwindycity.com/player-api/identity/customerLoginFromToken", {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "content-type": "application/json",
                    "Referer": "https://betwindycity.com/v2/"
                },
                "body": "{\"token\":\"" + token + "\",\"version\":\"1.3.47\"}",
                "method": "POST"
            });
            const data2 = await response2.json();
            account.token = data2.AccessToken;

        } catch (error) {
            console.log(this.serviceName, error);
        }

        return account;
    }
    async saveBet(token, selection, stake, agent) {
        const list = {
            "CaptchaMessage": null,
            "DelayKey": "",
            "DelaySeconds": 0,
            "Details": [
                {
                    "BetType": "S",
                    "TotalPicks": 1,
                    "IdTeaser": 0,
                    "IsFreePlay": false,
                    "Amount": stake,
                    "RoundRobinOptions": [],
                    "Wagers": [
                        {
                            "Id": selection,
                            "PitcherVisitor": false,
                            "PitcherHome": false
                        }
                    ],
                    "AmountCalculation": "A",
                    "ContinueOnPush": true,
                    "PropParlay": false
                }
            ],
            "PasswordConfirmation": null
        };

        await notify(`${this.serviceName} - ${account.username} saving bet`, "7807642696");

        const response = await fetch("https://betwindycity.com/player-api/api/wager/SaveBet/", {
            "agent": agent,
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "authorization": `Bearer ${token}`,
                "content-type": "application/json",
                "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "Referer": "https://betwindycity.com/v2/"
            },
            "body": JSON.stringify(list),
            "method": "POST"
        });
        const data = await response.json();
        const errorMsg = data?.Bets?.[0]?.Errors?.Bet?.[0]?.Description || "";
        if (errorMsg.match(/A minimum wager amount of \$ ([0-9.]+) is required/)) {
            stake = Number(errorMsg.match(/A minimum wager amount of \$ ([0-9.]+) is required/)?.[1]?.replace(/[$,USD]/g, "").trim());
            await new Promise(resolve => setTimeout(resolve, 1000));
            return await this.saveBet(token, selection, stake);
        }

        return { ticketNumber: data?.TicketNumber, errorMsg };
    }
    async confirmBet(token, ticketNumber, agent) {
        await notify(`${this.serviceName} - ${account.username} confirming bet`, "7807642696");

        const response = await fetch("https://betwindycity.com/player-api/api/wager/confirmBet/", {
            "agent": agent,
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "authorization": `Bearer ${token}`,
                "content-type": "application/json",
                "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "Referer": "https://betwindycity.com/v2/"
            },
            "body": `{\"TicketNumber\":${ticketNumber}}`,
            "method": "POST"
        });
        const data = await response.json();
        return data;
    }
    async placebet(account, betslip, stake, pointsT, oddsT, agent) {
        if (account.token == null) return { service: this.serviceName, account, msg: "Token expired" };

        const selection = [...betslip.sel.split("_").slice(0, 2), betslip.points, betslip.odds].join("_") + "_0_0_0";

        const { ticketNumber, errorMsg } = await this.saveBet(account.token, selection, stake, agent);
        if (errorMsg) return { service: this.serviceName, account, msg: errorMsg };
        const result = await this.confirmBet(account.token, ticketNumber, agent);
        if (result.StatusDescription == "ACCEPTED") return { service: this.serviceName, account, stake };
        return { service: this.serviceName, account, msg: result.StatusDescription };
    }
    async place(betslip, stake, pointsT=0, oddsT=10) {
        let outputs = [];
        stake = stake > betslip.limit ? betslip.limit : stake;
        for (let account of this.accounts) {
            const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;
            await notify(`${this.serviceName} - ${account.username} start placing bet`, "7807642696");
            const result = await this.placebet(account, betslip, Math.min(stake, account.user_max), pointsT, oddsT, agent);
            await notify(`${this.serviceName} - ${account.username} ${result.msg ? `failed: ${result.msg}` : `success: ${result.stake}`}`, "7807642696");
            outputs.push(result);
            stake -= result.stake || 0;
            if (stake <= 0) break;
        }
        return outputs;
    }
    async getUserInfo(account, agent) {
        try {
            const response = await fetch("https://betwindycity.com/player-api/api/customer/balance", {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${account.token}`,
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "Referer": "https://betwindycity.com/v2/"
                },
                "body": null,
                "method": "GET"
            });
            const result = await response.json();
            account.balance = result?.CurrentBalance;
            account.available = result?.AvailBalance;
            account.atrisk = result?.PendingBalance;
            if (account.balance == undefined || account.available == undefined || account.atrisk == undefined) account.token = null;

        } catch (error) {
            account.token = null;
            console.log(this.serviceName, error);
        }
        return account;
    }
    async userManager() {
        while (1) {
            for (let account of this.accounts) {
                const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;
                if (!account.token) {
                    await notify(`${this.serviceName} - ${account.username} login failed`, "7807642696");
                    account = await this.userLogin(account, agent);
                    if (account.token) await notify(`${this.serviceName} - ${account.username} login success`, "7807642696");
                }
                account = await this.getUserInfo(account, agent);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    async scraper() {
        while (1) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            let account = this.accounts.length > 0 ? this.accounts[0] : {};
            if (!account.token) continue;

            const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;

            const leagues = await this.getLeagues(account.token, agent);

            for (const league of leagues) {
                const is_ok = await this.getLeagueMatches(league, account.token, agent);
                let delay = this.isReady ? 1000 : 100;
                if (!is_ok) delay = 5000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            this.isReady = true;
            fs.writeFileSync(resolveApp(`./events/${process.env.USER_PORT}}/${this.serviceName}.json`), JSON.stringify(this.matches, null, 2));
        }
    }
}

module.exports = Betwindycity;
