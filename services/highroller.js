const fs = require("fs");
const fetch = require("node-fetch");
const { leagueNameCleaner, getPeriod, getFullName, teamNameCleaner, playerPropsCleaner, toleranceCheck, prettyLog } = require("../utils/utils.js");
const { JSDOM } = require("jsdom");
const { resolveApp } = require("../web/utils/path.js");
const { HttpsProxyAgent } = require('https-proxy-agent');
const { notify } = require("../utils/notify.js");

class Highroller {
    constructor() {
        this.serviceName = "highroller";
        this.hasRotNumber = true;
        this.isReady = false;
        this.matches = {};
        this.accounts = [];
    }
    async getLeagues(cookie, agent) {
        let leagueList = [];
        let viewState = null;
        let viewStateGenerator = null;
        let eventValidation = null;

        try {
            const response = await fetch("https://www.thehighroller.net/wager/CreateSports.aspx?WT=0&msg=true", {
                "agent": agent,
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": cookie,
                    "Referer": "https://www.thehighroller.net/Login.aspx"
                },
                "body": null,
                "method": "GET"
            });

            const result = await response.text();
            viewState = result.match(/name="__VIEWSTATE".*?value="([^"]+)"/)[1];
            viewStateGenerator = result.match(/name="__VIEWSTATEGENERATOR".*?value="([^"]+)"/)[1];
            eventValidation = result.match(/name="__EVENTVALIDATION".*?value="([^"]+)"/)[1];

            const dom = new JSDOM(result);
            let games = Array.from(dom.window.document.querySelectorAll("div.League") || []);

            for (const gm of games) {
                const sport = gm.querySelector("a").textContent;
                const leagues = gm.querySelectorAll("li");
                for (const league of leagues) {
                    const id = league.querySelector("input").getAttribute("value");
                    const desc = league.querySelector("label").textContent || "";
                    const result = leagueNameCleaner(sport, desc);
                    if (!result) continue;
                    leagueList.push({ id, ...result })
                }
            }

        } catch (error) {
            console.log(this.serviceName, error);
        }

        return { leagueList, viewState, viewStateGenerator, eventValidation };
    }
    async getLeagueMatches(league, cookie, viewState, viewStateGenerator, eventValidation, agent) {
        try {
            const { id, sport, desc } = league;

            const response = await fetch("https://www.thehighroller.net/wager/CreateSports.aspx?WT=0&msg=true", {
                "agent": agent,
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": cookie,
                    "Referer": "https://www.thehighroller.net/wager/CreateSports.aspx?WT=0&msg=true"
                },
                "body": `__EVENTTARGET=&__EVENTARGUMENT=&__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=${encodeURIComponent(viewStateGenerator)}&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}&lg_${id}=${id}&ctl00%24WagerContent%24btn_Continue=Continue&ctl00%24WagerContent%24hidden_ResponsiveInput=0`,
                "method": "POST"
            });

            const data = await response.text();
            const dom = new JSDOM(data);
            let games = Array.from(dom.window.document.querySelectorAll("tbody") || []);
            games = games.map(v => {
                const rot = v.querySelector("span.rotation-number");
                const team1 = v.querySelector("span.visit-team");
                const team2 = v.querySelector("span.home-team");
                const sprd1 = v.querySelector('input[name^="text_0"]');
                const sprd2 = v.querySelector('input[name^="text_1"]');
                const to = v.querySelector('input[name^="text_2"]');
                const tu = v.querySelector('input[name^="text_3"]');
                const ml1 = v.querySelector('input[name^="text_4"]');
                const ml2 = v.querySelector('input[name^="text_5"]');
                const draw = v.querySelector('input[name^="text_6"]');

                return {
                    team1: team1?.textContent.trim() || "",
                    team2: team2?.textContent.trim() || "",
                    rot1: team1 ? Number(rot?.textContent.trim()) : null,
                    rot2: team1 ? Number(rot?.textContent.trim()) + 1 : Number(rot?.textContent.trim()),
                    sprd1: sprd1?.getAttribute("value"),
                    sprd2: sprd2?.getAttribute("value"),
                    to: to?.getAttribute("value"),
                    tu: tu?.getAttribute("value"),
                    ml1: ml1?.getAttribute("value"),
                    ml2: ml2?.getAttribute("value"),
                    draw: draw?.getAttribute("value"),
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
                const isTT = `${gm.team1} ${gm.team2}`.toLowerCase().includes("total points");

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
                    const keyName = `${sport} [${gm.rot2}] ${team2} ${period} tto`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
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
                    const title = gm.team1 == gm.team2 ? `[${gm.rot1}] ${team1}` : `[${gm.rot1}] ${team1} : ${team2}`;
                    const keyName = `${sport} ${title} ${period} to`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, sel: gm.to, points, odds, suffix, order: order + 7 };
                }
                if (gm.tu && !isTT) {
                    const points = Number(gm.tu.split("_")[2]);
                    const odds = Number(gm.tu.split("_")[3]);
                    const title = gm.team1 == gm.team2 ? `[${gm.rot1}] ${team1}` : `[${gm.rot1}] ${team1} : ${team2}`;
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
    async userLogin(account, agent) {
        try {
            let response = await fetch("https://www.thehighroller.net/Login.aspx", {
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
                    "sec-fetch-site": "none",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                },
                "body": null,
                "method": "GET"
            });
            const data = await response.text();
            const viewState = data.match(/name="__VIEWSTATE".*?value="([^"]+)"/)[1];
            const viewStateGenerator = data.match(/name="__VIEWSTATEGENERATOR".*?value="([^"]+)"/)[1];
            const eventValidation = data.match(/name="__EVENTVALIDATION".*?value="([^"]+)"/)[1];
            const cookie = response.headers.get('set-cookie').replace(" path=/,", "").replace(" path=/; HttpOnly", "") + " IsAgent-IsClassic=false-true";

            response = await fetch("https://www.thehighroller.net/Login.aspx", {
                "agent": agent,
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
                    "cookie": cookie,
                    "Referer": "https://www.thehighroller.net/Login.aspx"
                },
                "body": `__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=${encodeURIComponent(viewStateGenerator)}&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}&Account=${account.username}&Password=${account.password}&ctl00%24MainContent%24loginControl1%24BtnSubmit=Login&IdBook=&Redir=&ctl00%24MainContent%24loginControl1%24hdnResponsiveUrl=%2FLogin.aspx&ctl00%24MainContent%24loginControl1%24hdnResponsiveMblUrl=%2FLogin.aspx&ctl00%24MainContent%24loginControl1%24hdnDynamicDskUrl=https%3A%2F%2Fdynamic.thehighroller.net%2Fservice%2FLogIn.aspx&ctl00%24MainContent%24loginControl1%24hdnDynamicMblUrl=https%3A%2F%2Fdynamic.thehighroller.net%2Fservice%2FLogInMobile.aspx&ctl00%24MainContent%24loginControl1%24hdnClassicAgDskUrl=agents%2F&ctl00%24MainContent%24loginControl1%24hdnClassicAgMblUrl=agents-mobile%2F&ctl00%24MainContent%24loginControl1%24hdnDynamicAgDskUrl=https%3A%2F%2Fdynamic.thehighroller.net%2Fagents%2FLogin.aspx&ctl00%24MainContent%24loginControl1%24hdnDynamicAgMblUrl=https%3A%2F%2Fdynamic.thehighroller.net%2Fagents%2FLoginMobile.aspx&ctl00%24MainContent%24loginControl1%24hdnIsMobile=False`,
                "method": "POST"
            });

            account.cookie = cookie;

        } catch (error) {
            console.log(this.serviceName, error);
        }

        return account;
    }
    async getViewState(cookie, leagueID, selection, agent) {
        let viewState = null;
        let viewStateGenerator = null;
        let eventValidation = null;

        await notify(`${this.serviceName} - ${account.username} getting view state`, "7807642696");

        try {
            const response = await fetch(`https://www.thehighroller.net/wager/CreateWager.aspx?WT=0&lg=${leagueID}&sel=${selection}_${selection}`, {
                "agent": agent,
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": cookie,
                    "Referer": "https://www.thehighroller.net/wager/CreateSports.aspx?WT=0&msg=true"
                },
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
    async createWager(cookie, leagueID, selection, stake, agent) {
        let { viewState, viewStateGenerator, eventValidation } = await this.getViewState(cookie, leagueID, selection);

        await notify(`${this.serviceName} - ${account.username} creating wager`, "7807642696");

        try {
            const response = await fetch(`https://www.thehighroller.net/wager/CreateWager.aspx?WT=0&lg=${leagueID}&sel=${selection}_${selection}`, {
                "agent": agent,
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": cookie,
                    "Referer": `https://www.thehighroller.net/wager/CreateWager.aspx?WT=0&lg=${leagueID}&sel=${selection}_${selection}`
                },
                "body": `__EVENTTARGET=&__EVENTARGUMENT=&__LASTFOCUS=&__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=${encodeURIComponent(viewStateGenerator)}&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}&BUY_${selection.split("_")[1]}_0=0&UseSameAmount=0&ctl00%24WagerContent%24chkPostBack=on&WAMT_=${stake}&RISKWIN=0&ctl00%24WagerContent%24btn_Continue1=Continue`,
                "method": "POST"
            });
            const data = await response.text();
            console.log(data);
            viewState = data.match(/name="__VIEWSTATE".*?value="([^"]+)"/)[1];
            viewStateGenerator = data.match(/name="__VIEWSTATEGENERATOR".*?value="([^"]+)"/)[1];
            eventValidation = data.match(/name="__EVENTVALIDATION".*?value="([^"]+)"/)[1];
            if (data.includes("Your Current Wager Limit is")) {
                stake = Number(data.match(/Your Current Wager Limit is ([0-9.]+)/)?.[1]?.replace(/[$,USD]/g, "").trim());
                return await this.createWager(cookie, leagueID, selection, stake);
            }
            else if (data.includes("This bet can't be accepted because Balance Exceeded.")) {
                return { viewState, viewStateGenerator, eventValidation, errorMsg: "This bet can't be accepted because Balance Exceeded." };
            }
        }
        catch (error) {
            console.log(this.serviceName, error);
        }
        return { viewState, viewStateGenerator, eventValidation, stake };
    }
    async placebet(account, betslip, stake, pointsT, oddsT, agent) {
        if (account.cookie == null) return { service: this.serviceName, account, msg: "Cookie expired" };

        const selection = [...betslip.sel.split("_").slice(0, 2), betslip.points, betslip.odds].join("_");
        const idmk = Number(selection[0]);

        const result = await this.createWager(account.cookie, betslip.idlg, betslip.sel, stake);
        const viewState = result.viewState;
        const viewStateGenerator = result.viewStateGenerator;
        const eventValidation = result.eventValidation;
        stake = result.stake;
        const errorMsg = result.errorMsg;

        if (errorMsg) return { service: this.serviceName, account, msg: errorMsg };

        await notify(`${this.serviceName} - ${account.username} confirming wager`, "7807642696");

        try {
            const response = await fetch("https://www.thehighroller.net/wager/ConfirmWager.aspx?WT=0", {
                "agent": agent,
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": account.cookie,
                    "Referer": `https://www.thehighroller.net/wager/CreateWager.aspx?WT=0&lg=${betslip.leagueID}&sel=${betslip.sel}_${betslip.sel}`
                },
                "body": `__EVENTTARGET=&__EVENTARGUMENT=&__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=${encodeURIComponent(viewStateGenerator)}&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}&password=${encodeURIComponent(account.password)}&RMV_0=&ctl00%24WagerContent%24btn_Continue1=Continue`,
                "method": "POST"
            });
            const data = await response.text();
            const lineChange = data.match(/LineChange text-danger">([^<]+)</)?.[1]?.replace("&frac12;", ".5").replace("&frac14;", ".25").replace("&frac34;", ".75").trim();
            if (lineChange) {
                const points = String(Number(lineChange.match(/^[+-]?[0-9.]+/)));
                const odds = String(Number(lineChange.match(/[+-]?[0-9.]+$/)));
                if (!toleranceCheck(points, odds, betslip.points, betslip.odds, pointsT, oddsT, idmk == 2 || idmk == 3 ? "total" : "")) {
                    await notify(`${this.serviceName} - ${account.username} game line change: ${betslip.points}/${betslip.odds} ➝ ${points}/${odds}`, "7807642696");
                    return { service: this.serviceName, account, msg: `Game line change. ${betslip.points}/${betslip.odds} ➝ ${points}/${odds}` };
                }
                return await this.placebet(account, { ...betslip, points, odds }, stake, pointsT, oddsT, agent)
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
            const response = await fetch("https://www.thehighroller.net/wager/CreateSports.aspx?WT=0&msg=true", {
                "agent": agent,
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "cookie": account.cookie,
                    "Referer": "https://www.thehighroller.net/Login.aspx"
                },
                "body": null,
                "method": "GET"
            });
            const result = await response.text();
            account.balance = Number(result.match(/Balance:[\s\S]*?<span class="[^"]*player-current-balance[^"]*">([^<]+)</)?.[1]?.replace(/[$,USD]/g, "").trim());
            account.available = Number(result.match(/Available:[\s\S]*?<span class="[^"]*player-balance-available[^"]*">([^<]+)</)?.[1]?.replace(/[$,USD]/g, "").trim());
            account.atrisk = Number(result.match(/At Risk:[\s\S]*?<span class="[^"]*player-at-risk[^"]*">([^<]+)</)?.[1]?.replace(/[$,USD]/g, "").trim());
            if (isNaN(account.balance) || isNaN(account.available) || isNaN(account.atrisk)) account.cookie = null;

        } catch (error) {
            account.cookie = null;
            console.log(this.serviceName, error);
        }
        return account;
    }
    async userManager() {
        while (1) {
            for (let account of this.accounts) {
                const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;
                if (!account.cookie) {
                    await notify(`${this.serviceName} - ${account.username} login failed`, "7807642696");
                    account = await this.userLogin(account, agent);
                    if (account.cookie) await notify(`${this.serviceName} - ${account.username} login success`, "7807642696");
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
            if (!account.cookie) continue;

            const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;

            const { leagueList, viewState, viewStateGenerator, eventValidation } = await this.getLeagues(account.cookie, agent);

            for (const league of leagueList) {
                const is_ok = await this.getLeagueMatches(league, account.cookie, viewState, viewStateGenerator, eventValidation, agent);
                let delay = this.isReady ? 1000 : 100;
                if (!is_ok) delay = 5000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            this.isReady = true;
            fs.writeFileSync(resolveApp(`./events/${process.env.USER_PORT}}/${this.serviceName}.json`), JSON.stringify(this.matches, null, 2));
        }
    }
}

module.exports = Highroller;
