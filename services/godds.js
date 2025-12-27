const fs = require("fs");
const fetch = require("node-fetch");
const { leagueNameCleaner, getPeriod, getFullName, teamNameCleaner, playerPropsCleaner, toleranceCheck, prettyLog } = require("../utils/utils.js");
const { resolveApp } = require("../web/utils/path.js");
const { HttpsProxyAgent } = require('https-proxy-agent');
const { notify } = require("../utils/notify.js");

class Godds {
    constructor(domain = "gotocasino.ag") {
        this.serviceName = "1bv";
        this.hasRotNumber = false;
        this.isReady = false;
        this.matches = {};
        this.accounts = [];
        this.domain = domain;
    }
    async getLeagues(playerToken, agent) {
        let leagues = [];
        try {
            const response = await fetch(`https://${this.domain}/Actions/api/Menu/GetMenu`, {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "apptoken": "E35EA58E-245D-44F3-B51D-C3BACCB1CFD3",
                    "locker-captcha-validated": "",
                    "locker-status": "",
                    "playertoken": playerToken,
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "Referer": `https://${this.domain}/BetSlip/`
                },
                "body": null,
                "method": "GET"
            });

            const data = await response.json();
            const groups = data?.Groups || [];
            for (const group of groups) {
                for (const league of group.Leagues) {
                    const id = league.LeagueId;
                    const sportId = league.SportId;
                    const result = leagueNameCleaner(sportId, league.LeagueDescription);
                    if (!result) continue;
                    leagues.push({ id, sportId, ...result })
                }
            }

        } catch (error) {
            console.log(this.serviceName, error);
        }
        return leagues;
    }
    async getLeagueMatches(league, playerToken, agent) {
        try {
            const { id, sportId, sport, desc } = league;

            const body = `leagueId=${id}&loadAgentLines=false&loadDefaultOdds=false&sportId=${sportId}&loadMlbLines=true&loadPropsEvents=false`;
            const response = await fetch(`https://${this.domain}/Actions/api/Event/GetEvent?${body}`, {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "apptoken": "E35EA58E-245D-44F3-B51D-C3BACCB1CFD3",
                    "locker-captcha-validated": "",
                    "locker-status": "",
                    "playertoken": playerToken,
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "Referer": `https://${this.domain}/BetSlip/`
                },
                "body": null,
                "method": "GET"
            });

            const data = await response.json();
            let games = data?.Events?.LEAGUES?.[0]?.EVENTS || [];
            const tntGames = data?.Events?.LEAGUES?.[0]?.EVENTSTNT || [];
            for (const gm of tntGames) {
                games.push(...gm.PARTICIPANTS);
            }

            for (const gm of games) {
                let team1 = gm.VISITOR_TEAM;
                let team2 = gm.HOME_TEAM;
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

                const period = getPeriod(sport + " " + desc + " " + gm.VISITOR_TEAM + " " + gm.HOME_TEAM);
                const order = period.startsWith("1") ? 1000 : period.startsWith("2") ? 2000 : period.startsWith("3") ? 3000 : period.startsWith("4") ? 4000 : 0;

                const base = { sport, desc, idgm: gm.GAME_ID, idgmType: gm.GAME_TYPE_ID, idfgm: gm.FAMILY_GAME, idpgm: gm.PARENT_GAME, hasRotNumber: this.hasRotNumber, is_props };
                const isTT = `${gm.VISITOR_TEAM} ${gm.HOME_TEAM}`.toLowerCase().includes("total");

                if (gm.VISITOR_ODDS) {
                    const odds = Number(gm.VISITOR_ODDS);
                    const keyName = `${sport} [#${id}] ${team1} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: gm.VISITOR_TEAM, idmk: 4, hv: 2, stl: 3, points: 0, odds, suffix, order: order + 0 };
                }
                if (gm.HOME_ODDS) {
                    const odds = Number(gm.HOME_ODDS);
                    const keyName = `${sport} [#${id}] ${team2} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: gm.HOME_TEAM, idmk: 5, hv: 1, stl: 3, points: 0, odds, suffix, order: order + 1 };
                }
                if (gm.VISITOR_SPREAD_ODDS) {
                    const points = Number(gm.VISITOR_SPREAD);
                    const odds = Number(gm.VISITOR_SPREAD_ODDS);
                    const keyName = `${sport} [#${id}] ${team1} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: gm.VISITOR_TEAM, idmk: 0, hv: 2, stl: 2, points, odds, suffix, order: order + 2 };
                }
                if (gm.HOME_SPREAD_ODDS) {
                    const points = Number(gm.HOME_SPREAD);
                    const odds = Number(gm.HOME_SPREAD_ODDS);
                    const keyName = `${sport} [#${id}] ${team2} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: gm.HOME_TEAM, idmk: 1, hv: 1, stl: 2, points, odds, suffix, order: order + 3 };
                }
                if (gm.OVER_ODDS && isTT) {
                    const points = Number(gm.TOTAL_OVER);
                    const odds = Number(gm.OVER_ODDS);
                    const keyName = `${sport} [#${id}] ${team2} ${period} tto`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: gm.HOME_TEAM, idmk: 2, hv: 2, stl: 1, points: -points, odds, suffix, order: order + 4 };
                }
                if (gm.UNDER_ODDS && isTT) {
                    const points = Number(gm.TOTAL_UNDER);
                    const odds = Number(gm.UNDER_ODDS);
                    const keyName = `${sport} [#${id}] ${team2} ${period} ttu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: gm.HOME_TEAM, idmk: 3, hv: 1, stl: 1, points, odds, suffix, order: order + 5 };
                }
                if (gm.VISITOR_SPECIAL_ODDS) {
                    const odds = Number(gm.VISITOR_SPECIAL_ODDS);
                    const keyName = `${sport} [#${id}] ${team1} : ${team2} ${period} draw`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: "draw", idmk: 6, hv: 3, stl: 3, points: 0, odds, suffix, order: order + 6 };
                }
                if (gm.OVER_ODDS && !isTT) {
                    const points = Number(gm.TOTAL_OVER);
                    const odds = Number(gm.OVER_ODDS);
                    const title = team1 == team2 ? team1 : `${team1} : ${team2}`;
                    const keyName = `${sport} [#${id}] ${title} ${period} to`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: team1, idmk: 2, hv: 2, stl: 1, points: -points, odds, suffix, order: order + 7 };
                }
                if (gm.UNDER_ODDS && !isTT) {
                    const points = Number(gm.TOTAL_UNDER);
                    const odds = Number(gm.UNDER_ODDS);
                    const title = team1 == team2 ? team1 : `${team1} : ${team2}`;
                    const keyName = `${sport} [#${id}] ${title} ${period} tu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: team2, idmk: 3, hv: 1, stl: 1, points, odds, suffix, order: order + 8 };
                }
                if (!gm.TEAM_NAME && gm.VISITOR_ODDS) {
                    const odds = Number(gm.VISITOR_ODDS);
                    const keyName = `${sport} [#${id}] ${team1} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: team1, idmk: 4, hv: 2, stl: 3, points: 0, odds, suffix, order: order + 0 };
                }
                if (!gm.TEAM_NAME && gm.HOME_ODDS) {
                    const odds = Number(gm.HOME_ODDS);
                    const keyName = `${sport} [#${id}] ${team2} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: team2, idmk: 5, hv: 1, stl: 3, points: 0, odds, suffix, order: order + 1 };
                }
                if (gm.TEAM_NAME && gm.HOME_ODDS) {
                    const odds = Number(gm.HOME_ODDS);
                    const keyName = `${sport} [#${id}] ${gm.TEAM_NAME} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, name: gm.TEAM_NAME, 4: 5, hv: 2, stl: 3, points: 0, odds, suffix, order: order + 2 };
                }
            }

            console.log(prettyLog(this.serviceName, sport, desc, games.length));
            return true;

        } catch (error) {
            console.log(this.serviceName, error, league);
        }
    }
    async placebet(account, betslip, stake, pointsT, oddsT, agent) {
        if (account.playerToken == null) return { service: this.serviceName, account, msg: "Player token expired" };

        let matchOdd = {
            odds: `${betslip.odds}`,
            oddsToShow: `${betslip.odds > 0 ? "+" : "-"}${Math.abs(betslip.odds).toFixed(2)}`,
            type: betslip.stl,
            [`style_${betslip.stl == 1 ? 'total' : betslip.stl == 2 ? 'spread' : 'money_line'}`]: betslip.idmk
        };

        if (betslip.stl == 1 || betslip.stl == 2) {
            const numberPoints = parseFloat(betslip.points);
            matchOdd.numberPoints = betslip.idmk == 2 ? -numberPoints : numberPoints;

            const points = `${Math.abs(betslip.points)}`.replace("0.5", "½").replace("0.25", "¼").replace("0.75", "¾").replace(".5", "½").replace(".25", "¼").replace(".75", "¾");
            if (betslip.stl == 1) matchOdd.points = `${betslip.idmk == 2 ? "o" : "u"}${points}`;
            else matchOdd.points = betslip.points == 0 ? "PK" : `${betslip.points > 0 ? "+" : "-"}${points}`;
        }

        const dateString = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "");
        let toRisk = 0;
        let toWin = 0;
        if (betslip.odds >= 100) {
            toRisk = stake;
            toWin = Math.round(stake * (betslip.odds / 100));
        } else {
            toRisk = Math.round(stake * (-betslip.odds / 100));
            toWin = stake;
        }

        const S = {
            Id: `${betslip.idgm}${betslip.name.replace(/ /g, "")}${betslip.stl}${betslip.hv}`,
            SportId: betslip.sport,
            GameId: betslip.idgm,
            GameTypeId: betslip.idgmType,
            TeamName: betslip.name,
            BetSpotType: betslip.stl,
            MatchOdd: matchOdd,
            OriginalMatchOdd: matchOdd,
            GameTime: betslip.gameTime,
            LeagueName: betslip.desc,
            BetTypeLimitUsed: false,
            BuyPoints: 0,
            ParentGameId: betslip.idpgm,
            FamilyGameId: betslip.idfgm,
            HomeOrVisitor: betslip.hv,
            IsOnOpenBets: false,
            Pitcher: 0
        };

        const body = {
            betSlip: {
                PlayerId: account.playerId,
                ProfileId: account.profileId,
                ProfileLimitId: account.profileLimitId,
                Details: [{
                    Id: `${dateString}1`,
                    Bets: [{
                        Id: `${dateString}11`,
                        ToRisk: toRisk,
                        ToWin: toWin,
                        Details: [S]
                    }],
                    BetType: 1,
                    OpenSpots: 0,
                    Amount: toRisk,
                    ToRisk: toRisk,
                    ToWin: toWin,
                    UseFreePlay: false
                }]
            }
        }

        try {
            const response = await fetch(`https://${this.domain}/Actions/api/Betting/SaveBet`, {
                // "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "apptoken": "E35EA58E-245D-44F3-B51D-C3BACCB1CFD3",
                    "content-type": "application/json",
                    "locker-captcha-validated": "",
                    "locker-status": "",
                    "playertoken": account.playerToken,
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin"
                },
                "referrer": `https://${this.domain}/BetSlip/`,
                "body": JSON.stringify(body),
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            });
            const data = await response.text();
            const res = JSON.parse(data);

            if (res[0].httpStatusCode == 200) {
                return { service: this.serviceName, account, stake };
            }
            else {
                const errorMsg = res[0].errorResponse.errorMessage;
                if (new RegExp("line change", "i").test(errorMsg)) {
                    const currentMatch = res[0].errorResponse.gameLists.differentGames[0];
                    const points = currentMatch.matchOdd.numberPoints;
                    const odds = currentMatch.matchOdd.odds;
                    if (!toleranceCheck(points, odds, betslip.points, betslip.odds, pointsT, oddsT, betslip.stl == 1 ? "total" : "")) {
                        notify(`${this.serviceName} - ${account.username} game line change: ${betslip.points}/${betslip.odds} ➝ ${points}/${odds}`);
                        return { service: this.serviceName, account, msg: `Game line change. ${betslip.points}/${betslip.odds} ➝ ${points}/${odds}` };
                    }
                    return await this.placebet(account, { ...betslip, points, odds }, stake, pointsT, oddsT);
                }
                else if (new RegExp("your current limit is", "i").test(errorMsg)) {
                    stake = Number(errorMsg.match(/Your current limit is ([0-9.]+)/)?.[1]?.replace(/[$,USD]/g, "").trim());
                    notify(`${this.serviceName} - ${account.username} wager limit reached: $${stake}`);
                    return await this.placebet(account, betslip, stake, pointsT, oddsT);
                }
                else if (new RegExp("captcha", "i").test(errorMsg)) {
                    return { service: this.serviceName, account, msg: "You need to change this account to a new account." };
                }
                else return { service: this.serviceName, account, msg: errorMsg };
            }
        }
        catch (error) {
            return { service: this.serviceName, account, msg: error.message };
        }
    }
    async place(betslip, stake, pointsT = 0, oddsT = 10) {
        let outputs = [];
        for (let account of this.accounts) {
            const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;
            notify(`${this.serviceName} - ${account.username} start placing bet`);
            const result = await this.placebet(account, betslip, Math.max(Math.min(stake, account.user_maxWager, account.user_max), account.minWager), pointsT, oddsT, agent);
            notify(`${this.serviceName} - ${account.username} ${result.msg ? `failed: ${result.msg}` : `success: ${result.stake}`}`);
            outputs.push(result);
            stake -= result.stake || 0;
            if (stake <= 0) break;
        }
        return outputs;
    }
    async userLogin(account, agent) {
        try {
            const response = await fetch(`https://${this.domain}/Actions/api/Login/PlayerLogin?player=${account.username}&password=${account.password}&domain=https://${this.domain}`, {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "apptoken": "E35EA58E-245D-44F3-B51D-C3BACCB1CFD3",
                    "locker-captcha-validated": "",
                    "locker-status": "",
                    "playertoken": "",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin"
                },
                "referrer": `https://${this.domain}/BetSlip/`,
                "body": null,
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            });
            account.playerToken = (await response.json()).PlayerToken;
        } catch (error) {
            console.log(this.serviceName, error);
        }

        return account;
    }
    async getUserInfo(account, agent) {
        try {
            const response = await fetch(`https://${this.domain}/Actions/api/PlayerInformation/ReloadInformation`, {
                "agent": agent,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "apptoken": "E35EA58E-245D-44F3-B51D-C3BACCB1CFD3",
                    "locker-captcha-validated": "",
                    "locker-status": "",
                    "playertoken": account.playerToken,
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "Referer": `https://${this.domain}/BetSlip/`
                },
                "body": null,
                "method": "GET"
            });
            const result = await response.json();
            account.balance = result?.Balance?.STANDARD_BALANCE?.CURRENT_BALANCE;
            account.available = result?.Balance?.STANDARD_BALANCE?.REAL_AVAIL_BALANCE;
            account.atrisk = result?.Balance?.STANDARD_BALANCE?.AMOUNT_AT_RISK;
            account.playerId = result?.PlayerInformation?.ID_PLAYER;
            account.profileId = result?.PlayerInformation?.ID_PROFILE;
            account.profileLimitId = result?.PlayerInformation?.PROFILE_LIMITSID;
            account.minWager = result?.PlayerInformation?.MIN_WAGER;
            account.user_maxWager = result?.PlayerInformation?.MAX_WAGER;
            if (account.balance == undefined || account.available == undefined || account.atrisk == undefined) account.playerToken = null;

        } catch (error) {
            account.playerToken = null;
            console.log(this.serviceName, error);
        }
        return account;
    }
    async userManager() {
        while (1) {
            for (let account of this.accounts) {
                const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;
                if (!account.playerToken) {
                    notify(`${this.serviceName} - ${account.username} login failed`);
                    account = await this.userLogin(account, agent);
                    if (account.playerToken) notify(`${this.serviceName} - ${account.username} login success`);
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
            if (!account.playerToken) continue;

            const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;

            const leagues = await this.getLeagues(account.playerToken, agent);

            for (const league of leagues) {
                const is_ok = await this.getLeagueMatches(league, account.playerToken, agent);
                let delay = this.isReady ? 1000 : 100;
                if (!is_ok) delay = 5000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            this.isReady = true;
            fs.writeFileSync(resolveApp(`./events/${process.env.USER_PORT}/${this.serviceName}.json`), JSON.stringify(this.matches, null, 2));
        }
    }
    async openBets(playerToken) {
        try {
            const response = await fetch(`https://${this.domain}/Actions/api/OpenBets/OpenBets`, {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "apptoken": "E35EA58E-245D-44F3-B51D-C3BACCB1CFD3",
                    "locker-captcha-validated": "",
                    "locker-status": "",
                    "playertoken": playerToken,
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "Referer": `https://${this.domain}/BetSlip/`
                },
                "body": null,
                "method": "GET"
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.log(this.serviceName, error);
        }
    }
}

module.exports = Godds;
