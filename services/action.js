const fs = require("fs");
const fetch = require("node-fetch");
const { leagueNameCleaner, getPeriod, getFullName, teamNameCleaner, playerPropsCleaner, toleranceCheck, prettyLog } = require("../utils/utils.js");
const { resolveApp } = require("../web/utils/path.js");
const { HttpsProxyAgent } = require('https-proxy-agent');
const { notify } = require("../utils/notify.js");

class Action {
    constructor() {
        this.serviceName = "action";
        this.hasRotNumber = true;
        this.isReady = false;
        this.matches = {};
        this.accounts = [];
    }
    async getLeagues(sessionId, agent) {
        let leagues = [];
        try {
            const response = await fetch("https://backend.play23.ag/wager/ActiveLeaguesHelper.aspx?WT=0", {
                agent: agent,
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "referer": "https://backend.play23.ag/wager/CreateSports.aspx?WT=0",
                    "cookie": `ASP.NET_SessionId=${sessionId}`
                }
            });

            const data = await response.json();

            for (const league of (data?.result || [])) {
                const result = leagueNameCleaner(league.IndexName, league.Description);
                if (!result) continue;
                leagues.push({ id: league.IdLeague, ...result })
            }

        } catch (error) {
            console.log(this.serviceName, error);
        }
        return leagues;
    }
    async getLeagueMatches(league, sessionId, agent) {
        try {
            const { id, sport, desc } = league;

            const response = await fetch(`https://backend.play23.ag/wager/NewScheduleHelper.aspx?WT=0&lg=${id}`, {
                agent: agent,
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "referer": `https://backend.play23.ag/wager/NewSchedule.aspx?lg=${id}&WT=0`,
                    "cookie": `ASP.NET_SessionId=${sessionId}`
                }
            });

            const data = await response.json();
            const listLeagues = data?.result?.listLeagues || [];
            const games = listLeagues.reduce((prev, current) => [...prev, ...current], []).map(v => v.Games).reduce((prev, current) => [...prev, ...current], []);

            for (const gm of games) {
                let team1 = gm.vtm || "";
                let team2 = gm.htm || "";
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

                const period = getPeriod(sport + " " + desc + " " + gm.vtm + " " + gm.htm);
                const order = period.startsWith("1") ? 1000 : period.startsWith("2") ? 2000 : period.startsWith("3") ? 3000 : period.startsWith("4") ? 4000 : 0;

                const base = { sport, desc, IdLeague: id, idgm: gm.idgm, hasRotNumber: this.hasRotNumber, is_props };
                const isTT = `${gm.htm} ${gm.vtm}`.toLowerCase().includes("team total");
                const gl = gm.GameLines[0];

                if (gl.voddsh) {
                    const odds = Number(gl.voddst);
                    const keyName = `${sport} [${gm.vnum}] ${team1} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: 4, points: 0, odds, suffix, order: order + 0 };
                }
                if (gl.hoddsh) {
                    const odds = Number(gl.hoddst);
                    const keyName = `${sport} [${gm.hnum}] ${team2} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: 5, points: 0, odds, suffix, order: order + 1 };
                }
                if (gl.vsprdh) {
                    const points = Number(gl.vsprdt);
                    const odds = Number(gl.vsprdoddst);
                    const keyName = `${sport} [${gm.vnum}] ${team1} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: 0, points, odds, suffix, order: order + 2 };
                }
                if (gl.hsprdh) {
                    const points = Number(gl.hsprdt);
                    const odds = Number(gl.hsprdoddst);
                    const keyName = `${sport} [${gm.hnum}] ${team2} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: 1, points, odds, suffix, order: order + 3 };
                }
                if (gl.ovh && isTT) {
                    const points = Number(gl.ovt);
                    const odds = Number(gl.ovoddst);
                    const keyName = `${sport} [${gm.hnum}] ${team2} ${period} tto`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: 2, points, odds, suffix, order: order + 4 };
                }
                if (gl.unh && isTT) {
                    const points = Number(gl.unt);
                    const odds = Number(gl.unoddst);
                    const keyName = `${sport} [${gm.hnum}] ${team2} ${period} ttu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: 3, points, odds, suffix, order: order + 5 };
                }
                if (gl.vspoddst) {
                    const odds = Number(gl.vspoddst);
                    const keyName = `${sport} [${gm.vnum}] ${team1} : ${team2} ${period} draw`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: 6, points: 0, odds, suffix, order: order + 6 };
                }
                if (gl.ovh && !isTT) {
                    const points = Number(gl.ovt);
                    const odds = Number(gl.ovoddst);
                    const title = gm.vtm == gm.htm ? `[${gm.vnum}] ${team1}` : `[${gm.vnum}] ${team1} : ${team2}`;
                    const keyName = `${sport} ${title} ${period} to`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: 2, points, odds, suffix, order: order + 7 };
                }
                if (gl.unh && !isTT) {
                    const points = Number(gl.unt);
                    const odds = Number(gl.unoddst);
                    const title = gm.vtm == gm.htm ? `[${gm.hnum}] ${team2}` : `[${gm.vnum}] ${team1} : ${team2}`;
                    const keyName = `${sport} ${title} ${period} tu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: 3, points, odds, suffix, order: order + 8 };
                }
                if (gl.oddsh) {
                    const odds = Number(gl.odds);
                    const keyName = `${sport} [${gm.hnum}] ${team2} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, idmk: gm.hnum || gl.tmnum, points: 0, odds, suffix, order: order + 9 };
                }
            }

            console.log(prettyLog(this.serviceName, sport, desc, games.length));
            return true;

        } catch (error) {
            console.log(this.serviceName, error, league);
        }
    }
    async createWager(sessionId, sel, IdLeague, agent) {
        try {
            const response = await fetch("https://backend.action23.ag/wager/CreateWagerHelper.aspx", {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "cookie": `_ga=GA1.2.908413924.1752595396; _ga_X975KR57TW=GS2.2.s1752652902$o2$g0$t1752652902$j60$l0$h0; ASP.NET_SessionId=${sessionId}; pl=`,
                    "Referer": `https://backend.action23.ag/wager/CreateWager.aspx?sel=${sel}&WT=0&lg=${IdLeague}`
                },
                "body": `IDWT=0&WT=0&open=0&sel=${sel}`,
                "method": "POST"
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.log(this.serviceName, error);
        }
    }
    async confirmWager(sessionId, sel, IdLeague, idgm, idmk, stake, agent) {
        const detailData = [{
            "Amount": stake,
            "RiskWin": "0",
            "TeaserPointsPurchased": 0,
            "IdGame": idgm,
            "Play": idmk,
            "Pitcher": 0,
            "Points": {
                "BuyPoints": 0,
                "BuyPointsDesc": "",
                "LineDesc": "",
                "selected": true
            }
        }];

        await notify(`${this.serviceName} - ${account.username} confirming wager`, "7807642696");

        try {
            const response = await fetch("https://backend.action23.ag/wager/ConfirmWagerHelper.aspx", {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "cookie": `_ga=GA1.2.908413924.1752595396; _ga_X975KR57TW=GS2.2.s1752652902$o2$g0$t1752652902$j60$l0$h0; ASP.NET_SessionId=${sessionId}; pl=`,
                    "Referer": `https://backend.action23.ag/wager/CreateWager.aspx?sel=${sel}&WT=0&lg=${IdLeague}`
                },
                "body": `IDWT=0&WT=0&amountType=1&detailData=${encodeURIComponent(JSON.stringify(detailData))}&open=0&roundRobinCombinations=&sameAmount=false&sameAmountNumber=0&sel=${sel}&useFreePlayAmount=false`,
                "method": "POST"
            });
            const data = await response.json();
            const errorMsg = data.result?.ErrorMsg;

            if (errorMsg == "MAXWAGERONLINE" || errorMsg == "MINWAGERONLINE") {
                stake = Number(data.result.ErrorMsgParams.replace(/[$,USD]/g, "").trim());
            }
            else if (errorMsg) {
                return { errorMsg };
            }

            return { stake };

        } catch (error) {
            console.log(this.serviceName, error);
        }
    }
    async placebet(account, betslip, stake, pointsT, oddsT, agent, deep = 0) {
        const { sessionId, password } = account;
        if (sessionId == null) return { service: this.serviceName, account, msg: "Session expired" };
        if (deep > 2) return resolve({ service: this.serviceName, account, msg: "Max deep reached" });

        const { IdLeague, idgm, idmk, points, odds } = betslip;
        const sel = `${idmk}_${idgm}_${points}_${odds}`;

        const confirmWagerResult = await this.confirmWager(sessionId, sel, IdLeague, idgm, idmk, stake, agent);
        if (!confirmWagerResult) return { service: this.serviceName, account, msg: "Confirm wager failed" };
        if (confirmWagerResult.errorMsg) return { service: this.serviceName, account, msg: confirmWagerResult.errorMsg };

        stake = confirmWagerResult.stake;

        await notify(`${this.serviceName} - ${account.username} posting wager`, "7807642696");

        try {
            const detailedData = [{ 
                "Amount": stake, 
                "RiskWin": "0", 
                "TeaserPointsPurchased": 0, 
                "IdGame": idgm, 
                "Play": idmk, 
                "Pitcher": 0, 
                "Points": { 
                    "BuyPoints": 0, 
                    "BuyPointsDesc": "", 
                    "LineDesc": "", 
                    "selected": true 
                } 
            }];

            const payload = [{
                "WT": "0",
                "open": 0,
                "IDWT": "0",
                "sel": sel,
                "sameAmount": false,
                "amountType": "1",
                "detailData": JSON.stringify(detailedData),
                "confirmPassword": password,
                "sameAmountNumber": stake,
                "useFreePlayAmount": false,
                "roundRobinCombinations": ""
            }];

            const response = await fetch("https://backend.play23.ag/wager/PostWagerMultipleHelper.aspx", {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "cookie": `_ga=GA1.2.775897760.1757515491; _ga_X975KR57TW=GS2.2.s1757515491$o1$g0$t1757515491$j60$l0$h0; ASP.NET_SessionId=${sessionId}; pl=`,
                    "Referer": "https://backend.play23.ag/wager/CreateWager.aspx"
                },
                "body": `postWagerRequests=${encodeURIComponent(JSON.stringify(payload))}`,
                "method": "POST"
            });

            const data = await response.json();
            const wagerResult = data.result[0].WagerPostResult;
            if (wagerResult.ErrorMsg == "GAMELINECHANGE") {
                const points = wagerResult.details[0].details[0].OriginalPoints;
                const odds = wagerResult.details[0].details[0].OriginalOdds;
                if (!toleranceCheck(points, odds, betslip.points, betslip.odds, pointsT, oddsT, betslip.idmk == 2 || betslip.idmk == 3 ? "total" : "")) {
                    await notify(`${this.serviceName} - ${account.username} game line change: ${betslip.points}/${betslip.odds} ➝ ${points}/${odds}`, "7807642696");
                    return { service: this.serviceName, account, msg: `Game line change. ${betslip.points}/${betslip.odds} ➝ ${points}/${odds}` };
                }
                this.placebet(account, { ...betslip, points, odds }, stake, pointsT, oddsT, agent, deep + 1).then(resolve);
            }
            else if (wagerResult.ErrorMsg) {
                return { service: this.serviceName, account, msg: wagerResult.ErrorMsg };
            }

            return { service: this.serviceName, account, stake };
        }
        catch (error) {
            console.log(this.serviceName, error);
        }
    }
    async place(betslip, stake, pointsT = 0, oddsT = 10) {
        let outputs = [];
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
    async userLogin(account, agent) {
        try {
            const page = await fetch("https://backend.play23.ag/Login.aspx").then(r => r.text());
            const viewState = page.match(/name="__VIEWSTATE".*?value="([^"]+)"/)[1];
            const viewStateGenerator = page.match(/name="__VIEWSTATEGENERATOR".*?value="([^"]+)"/)[1];

            const response = await fetch("https://backend.play23.ag/Login.aspx", {
                agent: agent,
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "origin": "https://backend.play23.ag",
                    "referer": "https://backend.play23.ag/Login.aspx"
                },
                body: `__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=${viewStateGenerator}&Account=${account.username}&Password=${account.password}&BtnSubmit=`,
                redirect: "manual"
            });

            account.sessionId = response.headers.get('set-cookie').match(/ASP\.NET_SessionId=([^;]+)/)[1];

        } catch (error) {
            console.log(this.serviceName, error);
        }

        return account;
    }
    async getUserInfo(account, agent) {
        try {
            const response = await fetch("https://backend.play23.ag/wager/Welcome.aspx?login=1", {
                "agent": agent,
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": `ASP.NET_SessionId=${account.sessionId}`,
                    "Referer": "https://backend.play23.ag/"
                },
                "body": null,
                "method": "GET"
            });
            const result = await response.text();
            account.balance = Number(result.match(/Balance:[\s\S]*?<span class="current-balance">([^<]+)</)?.[1]?.replace(/[$,USD]/g, "").trim());
            account.available = Number(result.match(/Available:[\s\S]*?<span class="real-avail-balance">[\s\S]*?<span class="real-avail-balance">([^<]+)</)?.[1]?.replace(/[$,USD]/g, "").trim());
            account.atrisk = Number(result.match(/At Risk:[\s\S]*?<span class="amount-at-risk">([^<]+)</)?.[1]?.replace(/[$,USD]/g, "").trim());
            if (isNaN(account.balance) || isNaN(account.available) || isNaN(account.atrisk)) account.sessionId = null;

        } catch (error) {
            account.sessionId = null;
            console.log(this.serviceName, error);
        }
        return account;
    }
    async userManager() {
        while (1) {
            for (let account of this.accounts) {
                const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;
                if (!account.sessionId) {
                    await notify(`${this.serviceName} - ${account.username} login failed`, "7807642696");
                    account = await this.userLogin(account, agent);
                    if (account.sessionId) await notify(`${this.serviceName} - ${account.username} login success`, "7807642696");
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
            if (!account.sessionId) continue;

            const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;

            const leagues = await this.getLeagues(account.sessionId, agent);

            for (const league of leagues) {
                const is_ok = await this.getLeagueMatches(league, account.sessionId, agent);
                let delay = this.isReady ? 1000 : 100;
                if (!is_ok) delay = 5000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            this.isReady = true;
            fs.writeFileSync(resolveApp(`./events/${process.env.USER_PORT}/${this.serviceName}.json`), JSON.stringify(this.matches, null, 2));
        }
    }
}

module.exports = Action;
