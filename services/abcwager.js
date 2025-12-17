const fs = require("fs");
const fetch = require("node-fetch");
const { leagueNameCleaner, getPeriod, getFullName, teamNameCleaner, playerPropsCleaner, toleranceCheck, prettyLog } = require("../utils/utils.js");
const { JSDOM } = require("jsdom");
const { resolveApp } = require("../web/utils/path.js");

class Abcwager {
    constructor() {
        this.serviceName = "abcwager";
        this.hasRotNumber = true;
        this.isReady = false;
        this.matches = {};
        this.accounts = [];
    }
    async getLeagues(sessionId) {
        let leagueList = [];
        try {
            const response = await fetch("https://wager.abcwagering.ag/wager/CreateSports.aspx?WT=0", {
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
                    "cookie": `pl=; ASP.NET_SessionId=${sessionId}; idSiteCookie=tagAgentURL=http://www.abcwagering.ag`,
                    "Referer": "https://wager.abcwagering.ag/DefaultLogin.aspx"
                },
                "body": null,
                "method": "GET"
            });
            const result = await response.text();
            const dom = new JSDOM(result);
            let blocks = Array.from(dom.window.document.querySelectorAll("div.leaguesblock") || []);

            for (const block of blocks) {
                let sport = block.querySelector("h3").textContent.trim();
                const leagues = block.querySelectorAll("div.leagueevent");
                for (const league of leagues) {
                    const id = league.querySelector("input").getAttribute("value");
                    let desc = league.textContent.trim();
                    const result = leagueNameCleaner(sport, desc);
                    if (!result) continue;
                    leagueList.push({ id, ...result })
                }
            }

        } catch (error) {
            console.log(this.serviceName, error);
        }
        return leagueList;
    }
    async getLeagueMatches(league, sessionId) {
        try {
            const { id, sport, desc } = league;

            const response = await fetch(`https://wager.abcwagering.ag/wager/splitschedule.aspx?wt=0&lg=${id}`, {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": `pl=; ASP.NET_SessionId=${sessionId}; idSiteCookie=tagAgentURL=http://www.abcwagering.ag`,
                    "Referer": "https://wager.abcwagering.ag/wager/CreateSports.aspx?WT=0"
                },
                "body": null,
                "method": "GET"
            });

            const data = await response.text();
            const dom = new JSDOM(data);
            const document = dom.window.document;
            let games = [...document.querySelectorAll("div.ScheduleGameEven"), ...document.querySelectorAll("div.ScheduleGameOver")];
            games = games.map(v => {
                const team = v.querySelector("img[src^='/App_Themes/ThemeLogo/images/teams/']");
                const parent = team?.parentElement || v;

                let [team1, team2] = Array.from(parent.childNodes)
                    .map(node => node.textContent.trim())
                    .filter(Boolean);

                let rot1 = null;
                let rot2 = null;
                const match = v.innerHTML.match(/(\d+)<br>(\d+)/i);
                if (match) [, rot1, rot2] = match;

                if (!Number.isNaN(Number(team1))) {
                    rot2 = Number(team1);
                    team1 = "";
                }

                const sprd1 = v.querySelector('input[value^="0_"]');
                const sprd2 = v.querySelector('input[value^="1_"]');
                const to = v.querySelector('input[value^="2_"]');
                const tu = v.querySelector('input[value^="3_"]');
                const ml1 = v.querySelector('input[value^="4_"]');
                const ml2 = team1 ? v.querySelector('input[value^="5_"]') : v.querySelector('input');
                const draw = v.querySelector('input[value^="6_"]');

                return {
                    team1: team1 || "",
                    team2: team2 || "",
                    rot1: rot1,
                    rot2: rot2,
                    sprd1: sprd1 ? sprd1.value : null,
                    sprd2: sprd2 ? sprd2.value : null,
                    to: to ? to.value : null,
                    tu: tu ? tu.value : null,
                    ml1: ml1 ? ml1.value : null,
                    ml2: ml2 ? ml2.value : null,
                    draw: draw ? draw.value : null,
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
                const isTT = `${gm.team1} ${gm.team2}`.toLowerCase().includes("total");

                if (gm.ml1) {
                    const odds = Number(gm.ml1.split("_")[3]);
                    const keyName = `${sport} [${gm.rot1}] ${team1} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.ml1, points: 0, odds, suffix, order: order + 0 };
                }
                if (gm.ml2) {
                    const odds = Number(gm.ml2.split("_")[3]);
                    const keyName = `${sport} [${gm.rot2}] ${team2} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.ml2, points: 0, odds, suffix, order: order + 1 };
                }
                if (gm.sprd1) {
                    const points = Number(gm.sprd1.split("_")[2]);
                    const odds = Number(gm.sprd1.split("_")[3]);
                    const keyName = `${sport} [${gm.rot1}] ${team1} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.sprd1, points, odds, suffix, order: order + 2 };
                }
                if (gm.sprd2) {
                    const points = Number(gm.sprd2.split("_")[2]);
                    const odds = Number(gm.sprd2.split("_")[3]);
                    const keyName = `${sport} [${gm.rot2}] ${team2} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.sprd2, points, odds, suffix, order: order + 3 };
                }
                if (gm.to && isTT) {
                    const points = Number(gm.to.split("_")[2]);
                    const odds = Number(gm.to.split("_")[3]);
                    const keyName = `${sport} [${gm.rot1}] ${team1} ${period} tto`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.to, points, odds, suffix, order: order + 4 };
                }
                if (gm.tu && isTT) {
                    const points = Number(gm.tu.split("_")[2]);
                    const odds = Number(gm.tu.split("_")[3]);
                    const keyName = `${sport} [${gm.rot2}] ${team2} ${period} ttu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.tu, points, odds, suffix, order: order + 5 };
                }

                if (gm.draw) {
                    const odds = Number(gm.draw.split("_")[3]);
                    const keyName = `${sport} [${gm.rot1}] ${team1} : ${team2} ${period} draw`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.draw, points: 0, odds, suffix, order: order + 6 };
                }
                if (gm.to && !isTT) {
                    const points = Number(gm.to.split("_")[2]);
                    const odds = Number(gm.to.split("_")[3]);
                    const title = team1 == team2 ? `[${gm.rot1}] ${team1}` : `[${gm.rot1}] ${team1} : ${team2}`;
                    const keyName = `${sport} ${title} ${period} to`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.to, points, odds, suffix, order: order + 7 };
                }
                if (gm.tu && !isTT) {
                    const points = Number(gm.tu.split("_")[2]);
                    const odds = Number(gm.tu.split("_")[3]);
                    const title = team1 == team2 ? `[${gm.rot1}] ${team1}` : `[${gm.rot1}] ${team1} : ${team2}`;
                    const keyName = `${sport} ${title} ${period} tu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.tu, points, odds, suffix, order: order + 8 };
                }
            }

            console.log(prettyLog(this.serviceName, sport, desc, games.length));
            return true;

        } catch (error) {
            console.log(this.serviceName, error, league);
        }
    }
    async userLogin(account) {
        try {
            const response = await fetch("https://wager.abcwagering.ag/DefaultLogin.aspx", {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-site",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": "pl=; ASP.NET_SessionId=; idSiteCookie=tagAgentURL=http://www.abcwagering.ag",
                    "Referer": "https://www.abcwagering.ag/"
                },
                "body": `siteID=11&errorURL=%2F%2Fwww.abcwagering.ag%2F%3Flogin-error&account=${account.username}&password=${account.password}`,
                "method": "POST"
            });
            const cookie = response.headers.get('set-cookie');
            const sessionId = cookie.match(/ASP\.NET_SessionId=([^;]+)/)[1];
            account.sessionId = sessionId;

            await fetch("https://wager.abcwagering.ag/login.aspx", {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "upgrade-insecure-requests": "1",
                    "cookie": `pl=; ASP.NET_SessionId=${sessionId}; idSiteCookie=tagAgentURL=http://www.abcwagering.ag`,
                    "Referer": "https://wager.abcwagering.ag/DefaultLogin.aspx"
                },
                "body": `Account=${account.username}&Password=${account.password}&IdBook=6&Redir=&ErrorURL=%2F%2Fwww.abcwagering.ag%2F%3Flogin-error&SiteID=11`,
                "method": "POST",
                "redirect": "manual"
            });

        } catch (error) {
            console.log(this.serviceName, error);
        }

        return account;
    }
    async getViewState(account, leagueID, selection) {
        let viewState = null;
        let viewStateGenerator = null;
        let eventValidation = null;

        try {
            const response = await fetch(`https://wager.abcwagering.ag/wager/CreateWager.aspx?lg=${leagueID}&wt=0&sel=${selection}`, {
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
                    "cookie": `pl=; ASP.NET_SessionId=${account.sessionId}; idSiteCookie=tagAgentURL=http://www.abcwagering.ag`,
                    "Referer": `https://wager.abcwagering.ag/wager/splitschedule.aspx?wt=0&lg=${leagueID}`
                },
                "body": null,
                "method": "GET"
            });
            const data = await response.text();
            viewState = data.match(/name="__VIEWSTATE".*?value="([^"]+)"/)[1];
            viewStateGenerator = data.match(/name="__VIEWSTATEGENERATOR".*?value="([^"]+)"/)[1];
            eventValidation = data.match(/name="__EVENTVALIDATION".*?value="([^"]+)"/)[1];

        } catch (error) {
            console.log(this.serviceName, error);
        }
        return { viewState, viewStateGenerator, eventValidation };
    }
    async createWager(account, leagueID, selection, stake) {
        let { viewState, viewStateGenerator, eventValidation } = await this.getViewState(account, leagueID, selection);

        try {
            const response = await fetch(`https://wager.abcwagering.ag/wager/CreateWager.aspx?lg=${leagueID}&sel=${selection}&wt=0`, {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": `pl=; ASP.NET_SessionId=${account.sessionId}; idSiteCookie=tagAgentURL=http://www.abcwagering.ag`,
                    "Referer": `https://wager.abcwagering.ag/wager/CreateWager.aspx?lg=${leagueID}&wt=0&sel=${selection}`
                },
                "body": `__EVENTTARGET=&__EVENTARGUMENT=&__LASTFOCUS=&__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=${encodeURIComponent(viewStateGenerator)}&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}&BUY_${selection.split("_")[1]}_0=0&ctl00%24WagerContent%24chkPostBack=on&UseSameAmount=0&WAMT_=${stake}&ctl00%24WagerContent%24btn_Continue1=Continue&RISKWIN=0`,
                "method": "POST"
            });
            const data = await response.text();
            viewState = data.match(/name="__VIEWSTATE".*?value="([^"]+)"/)[1];
            viewStateGenerator = data.match(/name="__VIEWSTATEGENERATOR".*?value="([^"]+)"/)[1];
            eventValidation = data.match(/name="__EVENTVALIDATION".*?value="([^"]+)"/)[1];
            if (data.includes("Your Current Wager Limit is")) {
                stake = Number(data.match(/Your Current Wager Limit is ([0-9.]+)/)?.[1]?.replace(/[$,USD]/g, "").trim());
                return await this.createWager(account, leagueID, selection, stake);
            }
        }
        catch (error) {
            console.log(this.serviceName, error);
        }
        return { viewState, viewStateGenerator, eventValidation, stake };
    }
    async placebet(account, betslip, stake, pointsT, oddsT, deep = 0) {
        if (deep >= 2) return resolve({ service: this.serviceName, account, msg: "Max deep reached" });
        if (account.sessionId == null) return { service: this.serviceName, account, msg: "Session expired" };

        const selection = [...betslip.sel.split("_").slice(0, 2), betslip.points, betslip.odds].join("_");
        const idmk = Number(selection[0]);

        const result = await this.createWager(account, betslip.idlg, betslip.sel, stake);
        const viewState = result.viewState;
        const viewStateGenerator = result.viewStateGenerator;
        const eventValidation = result.eventValidation;
        stake = result.stake;

        try {
            const response = await fetch("https://wager.abcwagering.ag/wager/ConfirmWager.aspx?WT=0", {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": `pl=; ASP.NET_SessionId=${account.sessionId}; idSiteCookie=tagAgentURL=http://www.abcwagering.ag`,
                    "Referer": `https://wager.abcwagering.ag/wager/CreateWager.aspx?lg=${betslip.idlg}&sel=${betslip.sel}`
                },
                "body": `__EVENTTARGET=&__EVENTARGUMENT=&__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=${encodeURIComponent(viewStateGenerator)}&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}&password=${account.password}&RMV_0=&ctl00%24WagerContent%24btn_Continue1=Continue`,
                "method": "POST"
            });
            const data = await response.text();
            const lineChange = data.match(/LineChange text-danger">([^<]+)</)?.[1]?.replace("&frac12;", ".5").replace("&frac14;", ".25").replace("&frac34;", ".75").trim();
            if (lineChange) {
                const points = String(Number(lineChange.match(/^[+-]?[0-9.]+/)));
                const odds = String(Number(lineChange.match(/[+-]?[0-9.]+$/)));
                if (!toleranceCheck(points, odds, betslip.points, betslip.odds, pointsT, oddsT, idmk == 2 || idmk == 3 ? "total" : "")) {
                    return { service: this.serviceName, account, msg: `Game line change. ${betslip.points}/${betslip.odds} ➝ ${points}/${odds}` };
                }
                return await this.placebet(account, { ...betslip, points, odds }, stake, pointsT, oddsT, deep + 1);
            }
            else {
                const errorMsg = data.match(/The Following Error Occurred:[\s\S]*?<span id="ctl00_WagerContent_ctl00_lblError">([^<]+)</)?.[1]?.trim();
                if (errorMsg) return { service: this.serviceName, account, msg: errorMsg };
                return { service: this.serviceName, account, stake };
            }
        }
        catch (error) {
            return { service: this.serviceName, account, msg: error.message };
        }
    }
    async place(betslip, stake, pointsT=0, oddsT=10) {
        let outputs = [];
        for (let account of this.accounts) {
            const result = await this.placebet(account, betslip, Math.min(stake, account.user_max), pointsT, oddsT);
            outputs.push(result);
            stake -= result.stake || 0;
            if (stake <= 0) break;
        }
        return outputs;
    }
    async getUserInfo(account) {
        try {
            const response = await fetch("https://wager.abcwagering.ag/wager/CreateSports.aspx?WT=0", {
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
                    "cookie": `pl=; ASP.NET_SessionId=${account.sessionId}; idSiteCookie=tagAgentURL=http://www.abcwagering.ag`,
                    "Referer": "https://wager.abcwagering.ag/DefaultLogin.aspx"
                },
                "body": null,
                "method": "GET"
            });
            const result = await response.text();
            account.balance = Number(result.match(/Balance:[\s\S]*?<span id="ctl00_lbCurrentBalance">([^<]+)</)?.[1]?.replace(/[$,USD]/g, "").trim());
            account.available = Number(result.match(/Available:[\s\S]*?<span id="ctl00_lbAvailBalance">([^<]+)</)?.[1]?.replace(/[$,USD]/g, "").trim());
            account.atrisk = Number(result.match(/Risk:[\s\S]*?<span id="ctl00_lbAmountAtRisk">([^<]+)</)?.[1]?.replace(/[$,USD]/g, "").trim());
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
                if (!account.sessionId) account = await this.userLogin(account);
                account = await this.getUserInfo(account);
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

            const leagues = await this.getLeagues(account.sessionId);

            for (const league of leagues) {
                const is_ok = await this.getLeagueMatches(league, account.sessionId);
                let delay = this.isReady ? 1000 : 100;
                if (!is_ok) delay = 5000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            this.isReady = true;
            fs.writeFileSync(resolveApp(`${process.env.DIR_EVENTS}/${this.serviceName}.json`), JSON.stringify(this.matches, null, 2));
        }
    }
}

module.exports = Abcwager;
