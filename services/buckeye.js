const fs = require("fs");
const fetch = require("node-fetch");
const { leagueNameCleaner, getPeriod, getFullName, teamNameCleaner, playerPropsCleaner, toleranceCheck, prettyLog } = require("../utils/utils.js");
const { JSDOM } = require("jsdom");
const { resolveApp } = require("../web/utils/path.js");
const { HttpsProxyAgent } = require('https-proxy-agent');
const { notify } = require("../utils/notify.js");

class Buckeye {
    constructor() {
        this.serviceName = "buckeye";
        this.hasRotNumber = true;
        this.isReady = false;
        this.matches = {};
        this.accounts = [];
    }
    async getLeagues(username, code, agent) {
        let leagues = [];
        try {
            const response = await fetch("https://strikerich.ag/cloud/api/League/Get_SportsLeagues", {
                "agent": agent,
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${code}`,
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-requested-with": "XMLHttpRequest",
                    "Referer": "https://strikerich.ag/sports.html"
                },
                "body": `customerID=${username}_0+++&wagerType=Straight&office=PREMIER&placeLateFlag=false&operation=Get_SportsLeagues&RRO=1&agentSite=0`,
                "method": "POST"
            });

            const data = await response.json();
            for (const league of (data?.Leagues || [])) {
                const { SportType, SportSubType, SportSubTypeDisplay, PeriodDescription, PeriodNumber } = league;
                if (SportSubTypeDisplay == "") continue;
                const result = leagueNameCleaner(SportType, SportSubTypeDisplay + " " + PeriodDescription);
                if (result) leagues.push({ ...result, sportType: SportType, sportSubType: SportSubType, period_0: PeriodDescription, periodNumber: PeriodNumber });
            }

        } catch (error) {
            console.log(this.serviceName, error);
        }
        return leagues;
    }
    async getLeagueMatches(league, username, code, agent) {
        try {
            const { sport, desc, sportType, sportSubType, period_0, periodNumber } = league;

            const response = await fetch("https://strikerich.ag/cloud/api/Lines/Get_LeagueLines2", {
                "agent": agent,
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${code}`,
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-requested-with": "XMLHttpRequest",
                    "Referer": "https://strikerich.ag/sports.html"
                },
                "body": `customerID=${username}_0+++&operation=Get_LeagueLines2&sportType=${sportType}&sportSubType=${sportSubType}&period=${period_0}&hourFilter=0&propDescription=&wagerType=Straight&keyword=&office=PREMIER&correlationID=&periodNumber=${periodNumber}&periods=0&rotOrder=0&placeLateFlag=false&RRO=1&agentSite=0`,
                "method": "POST"
            });

            const data = await response.json();
            const games = data?.Lines || [];

            for (const gm of games) {
                let team1 = gm.Team1ID;
                let team2 = gm.Team2ID;
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

                const period = getPeriod(sport + " " + desc + " " + gm.Team1ID + " " + gm.Team2ID);
                const order = period.startsWith("1") ? 1000 : period.startsWith("2") ? 2000 : period.startsWith("3") ? 3000 : period.startsWith("4") ? 4000 : 0;

                const base = { sport, desc, gameNum: gm.GameNum, periodNumber: gm.PeriodNumber, status: gm.Status, periodType: gm.PeriodDescription, team1: gm.Team1ID, team2: gm.Team2ID };

                if (gm.MoneyLine1) {
                    const odds = Number(gm.MoneyLine1);
                    const keyName = `${sport} [${gm.Team1RotNum}] ${team1} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "M", points: 0, odds, suffix, order: order + 1 };
                }
                if (gm.MoneyLine2) {
                    const odds = Number(gm.MoneyLine2);
                    const keyName = `${sport} [${gm.Team2RotNum}] ${team2} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "M", points: 0, odds, suffix, order: order + 2 };
                }
                if (gm.SpreadAdj1) {
                    const points = Number(gm.Spread);
                    const odds = Number(gm.SpreadAdj1);
                    const keyName = `${sport} [${gm.Team1RotNum}] ${team1} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "S", points, odds, suffix, order: order + 3 };
                }
                if (gm.SpreadAdj2) {
                    const points = Number(gm.Spread);
                    const odds = Number(gm.SpreadAdj2);
                    const keyName = `${sport} [${gm.Team2RotNum}] ${team2} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "S", points, odds, suffix, order: order + 4 };
                }
                if (gm.TtlPtsAdj1) {
                    const points = Number(gm.TotalPoints);
                    const odds = Number(gm.TtlPtsAdj1);
                    const title = gm.Team1ID == gm.Tea2ID ? `[${gm.Team1RotNum}] ${team1}` : `[${gm.Team1RotNum}] ${team1} : ${team2}`;
                    const keyName = `${sport} ${title} ${period} to`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points: -points, odds, suffix, order: order + 5 };
                }
                if (gm.TtlPtsAdj2) {
                    const points = Number(gm.TotalPoints);
                    const odds = Number(gm.TtlPtsAdj2);
                    const title = gm.Team1ID == gm.Tea2ID ? `[${gm.Team2RotNum}] ${team2}` : `[${gm.Team1RotNum}] ${team1} : ${team2}`;
                    const keyName = `${sport} ${title} ${period} tu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points, odds, suffix, order: order + 6 };
                }
                if (gm.MoneyLineDraw) {
                    const odds = Number(gm.MoneyLineDraw);
                    const keyName = `${sport} [${gm.Team1RotNum}] ${team1} : ${team2} ${period} draw`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "M", points: 0, odds, suffix, order: order + 7 };
                }
                if (gm.Team1TtlPtsAdj1) {
                    const points = Number(gm.Team1TotalPoints);
                    const odds = Number(gm.Team1TtlPtsAdj1);
                    const keyName = `${sport} [${gm.Team1RotNum}] ${team1} ${period} tto`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points: -points, odds, suffix, order: order + 8 };
                }
                if (gm.Team1TtlPtsAdj2) {
                    const points = Number(gm.Team1TotalPoints);
                    const odds = Number(gm.Team1TtlPtsAdj2);
                    const keyName = `${sport} [${gm.Team1RotNum}] ${team1} ${period} ttu`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points, odds, suffix, order: order + 8 };
                }
                if (gm.Team2TtlPtsAdj1) {
                    const points = Number(gm.Team2TotalPoints);
                    const odds = Number(gm.Team2TtlPtsAdj1);
                    const keyName = `${sport} [${gm.Team2RotNum}] ${team2} ${period} tto`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points: -points, odds, suffix, order: order + 9 };
                }
                if (gm.Team2TtlPtsAdj2) {
                    const points = Number(gm.Team2TotalPoints);
                    const odds = Number(gm.Team2TtlPtsAdj2);
                    const keyName = `${sport} [${gm.Team2RotNum}] ${team2} ${period} ttu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points, odds, suffix, order: order + 9 };
                }
            }
           
            console.log(prettyLog(this.serviceName, sport, desc, games.length));
            return true;

        } catch (error) {
            console.log(this.serviceName, error, league);
        }
    }
    async placebet(account, betslip, stake) {
        if (account.code == null) return { service: this.serviceName, account, msg: "Token expired" };

        const pointsTolerance = tolerances.Points[betslip.sport] || 0;
        const oddsTolerance = tolerances.Cents[betslip.sport] || 10;
        const risk = Math.abs(betslip.odds >= 100 ? stake : Math.round(stake * (betslip.odds / 100)));
        const win = Math.abs(betslip.odds >= 100 ? Math.round(stake * (betslip.odds / 100)) : stake);

        const { sport, desc, gameNum, periodNumber, status, periodType, wagerType, points, odds, chosenTeamID } = betslip;

        const list1 = [{ gameNum, periodNumber, "store": "PPHINSIDER", status, "profile": ".", periodType, risk: String(risk), win: String(win), wagerType }];
        const list2 = [{ "customerID": account.username + "0   ", wagerType, gameNum, "wagerCount": 1, "buyingFlag": "N", "extraGames": "N", "lineType": wagerType, "priceType": "A", "finalMoney": betslip.odds, chosenTeamID, "riskAmount": risk, "winAmount": win, "store": "PPHINSIDER          ", "office": "PREMIER", "custProfile": ".                   ", periodNumber, "periodDescription": periodType, "oddsFlag": "N", "listedPitcher1": null, "pitcher1ReqFlag": "Y", "listedPitcher2": null, "pitcher2ReqFlag": "Y", "currencyCode": "USD", "agentID": "MYLESM07A.", "creditAcctFlag": "Y", "wager": { "minPicks": 1, "totalPicks": 1, "maxPayOut": 0, "wagerCount": 1, "riskAmount": String(risk), "winAmount": String(win), "lineType": wagerType, "team": 1, "freePlay": "N", "agentID": "MYLESM07A.", "currencyCode": "USD", "creditAcctFlag": "Y", "playNumber": 1 }, "itemNumber": 1, "wagerNumber": 0, "extra": { team1, team2, "line": `${points > 0 ? "+" : ""}${points} ${odds > 0 ? "+" : ""}${odds}`, "buy": false, "point": 0 }, status, "printing": false }];

        try {
            let res = await fetch("https://strikerich.ag/cloud/api/WagerSport/checkWagerLineMulti", {
                "headers": {
                    "accept": "*/*",
                    "authorization": `Bearer ${account.code}`,
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "x-requested-with": "XMLHttpRequest",
                },
                "body": `list=${encodeURIComponent(JSON.stringify(list1))}&token=${account.code}&customerID=RD341_0+++&operation=checkWagerLineMulti&RRO=0&agentSite=0`,
                "method": "POST"
            });
            res = await res.json();
            const delay = res.DELAY;
            res = await fetch("https://strikerich.ag/cloud/api/WagerSport/insertWagerStraight", {
                "headers": {
                    "accept": "*/*",
                    "authorization": `Bearer ${account.code}`,
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "x-requested-with": "XMLHttpRequest",
                },
                "body": `customerID=RD341_0+++&list=${encodeURIComponent(JSON.stringify(list2))}&agentView=false&operation=insertWagerStraight&agToken=&delay=${encodeURIComponent(JSON.stringify(delay))}&agentSite=0`,
                "method": "POST"
            });
            const result = await res.json();
            if (result?.STATUS?.test == "ok") return { service: this.serviceName, account, stake };
            return { service: this.serviceName, account, msg: "failed" };
        }
        catch (error) {
            return { service: this.serviceName, account, msg: error.message };
        }
    }
    async place(betslip, stake) {
        let outputs = [];
        for (let account of this.accounts) {
            const result = await this.placebet(account, betslip, stake);
            outputs.push(result);
        }
        return outputs;
    }
    async userLogin(account, agent) {
        try {
            const response = await fetch(`https://strikerich.ag/cloud/api/System/authenticateCustomer`, {
                "agent": agent,
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": "Bearer undefined",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-requested-with": "XMLHttpRequest",
                    "Referer": "https://strikerich.ag/"
                },
                "referrer": "https://strikerich.ag/BetSlip/",
                "body": `customerID=${account.username}&state=true&password=${account.password}&multiaccount=1&response_type=code&client_id=${account.username}&domain=strikerich.ag&redirect_uri=strikerich.ag&operation=authenticateCustomer&RRO=1`,
                "method": "POST",
                "mode": "cors",
            });
            const data = await response.json();
            account.code = data.code;

        } catch (error) {
            console.log(this.serviceName, error);
        }

        return account;
    }
    async getUserInfo(account, agent) {
        try {
            const response = await fetch("https://strikerich.ag/cloud/api/Customer/getAccountInfo", {
                "agent": agent,
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${account.code}`,
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-requested-with": "XMLHttpRequest",
                    "cookie": "__cf_bm=mRWpkTGuNiSPOogggbA4bN2nCToDiATNOSrmdazAifQ-1762346507-1.0.1.1-o.jlC_KDM2cDCuFlfS1LxOisXyBvUb92guOojvfdbSj3NUOP0zeDcrCyvT89Hjs5GmThHHDog3EGasolGQfOFPs.U7OxSUm30vALZdBqrss; PHPSESSID=16c3s18ulrb898rcaa7birisc6",
                    "Referer": "https://strikerich.ag/sports.html?v=1762346533537"
                },
                "body": `customerID=${account.username}_0&token=${account.code}&access_token=${account.code}&operation=getAccountInfo&RRO=0&agentSite=0`,
                "method": "POST"
            });
            const result = await response.json();
            account.balance = result?.accountInfo?.CurrentBalance / 100;
            account.available = result?.accountInfo?.AvailableBalance;
            account.atrisk = result?.accountInfo?.PendingWagerBalance / 100;
            if (isNaN(account.balance) || isNaN(account.available) || isNaN(account.atrisk)) account.code = null;

        } catch (error) {
            account.code = null;
            console.log(this.serviceName, error);
        }
        return account;
    }
    async userManager() {
        while (1) {
            for (let account of this.accounts) {
                const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;
                if (!account.code) {
                    await notify(`${this.serviceName} - ${account.username} login failed`, "7807642696");
                    account = await this.userLogin(account, agent);
                    if (account.code) await notify(`${this.serviceName} - ${account.username} login success`, "7807642696");
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
            if (!account.code) continue;

            const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;

            const leagues = await this.getLeagues(account.username, account.code, agent);

            for (const league of leagues) {
                const is_ok = await this.getLeagueMatches(league, account.username, account.code, agent);
                let delay = this.isReady ? 1000 : 100;
                if (!is_ok) delay = 5000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            this.isReady = true;
            fs.writeFileSync(resolveApp(`./events/${process.env.USER_PORT}/${this.serviceName}.json`), JSON.stringify(this.matches, null, 2));
        }
    }
}

module.exports = Buckeye;
