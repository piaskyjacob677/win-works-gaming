const fs = require("fs");
const fetch = require("node-fetch");
const { prettyLog } = require("../utils/log.js");
const { resolveApp } = require("../web/utils/path.js");
const tolerances = require(resolveApp(`${process.env.DIR_DATA}/tolerances.json`));
const { getFullName, getAlias, cleanTeamName, cleanGpd, toleranceCheck } = require("../utils/alias.js");
const { getOrder } = require("../utils/order.js");
const accounts = require(resolveApp(`${process.env.DIR_DATA}/accounts.json`));

class Strikerich {
    constructor() {
        this.serviceName = "Strikerich";
        this.isReady = false;
        this.globalMatches = {};
        this.matches = {};
        this.uids = [];
        this.aiRequests = 0;
        this.accounts = accounts[this.serviceName];
    }
    async getLeagues(username, code) {
        let leagues = [];
        try {
            const response = await fetch("https://strikerich.ag/cloud/api/League/Get_SportsLeagues", {
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
            leagues = data?.Leagues || [];

        } catch (error) {
            console.log(this.serviceName, error);
        }
        return leagues;
    }
    async getLeagueMatches(league, username, code) {
        try {
            let unNormalizedTeams = [];
            let sport = league.SportType;
            const desc = `${sport} - ${league.SportSubType} - ${league.PeriodDescription}`;

            if (desc.includes("UFC") || desc.includes("MMA")) sport = "FIGHTING";
            else if (desc.includes("NCAAF") || (sport == "FOOTBALL" && desc.includes("COLLEGE"))) sport = "CFB";
            else if (desc.includes("NHL")) sport = "NHL";
            else if (desc.includes("NFL")) sport = "NFL";
            else if (desc.includes("WNBA")) sport = "WNBA";
            else if (desc.includes("NBA")) sport = "NBA";
            else if (desc.includes("MLB")) sport = "MLB";
            else if (desc.includes("MiLB")) sport = "MiLB";
            else if (desc.includes("NCAAB") || (sport == "BASKETBALL" && desc.includes("COLLEGE"))) sport = "CBB";
            else if (sport == "SOCCER") sport = "SOC";

            const response = await fetch("https://strikerich.ag/cloud/api/Lines/Get_LeagueLines2", {
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
                "body": `customerID=${username}_0+++&operation=Get_LeagueLines2&sportType=${league.SportType}&sportSubType=${league.SportSubType}&period=${league.PeriodDescription}&hourFilter=0&propDescription=&wagerType=Straight&keyword=&office=PREMIER&correlationID=&periodNumber=${league.PeriodNumber}&periods=0&rotOrder=0&placeLateFlag=false&RRO=1&agentSite=0`,
                "method": "POST"
            });

            const data = await response.json();
            const games = data?.Lines || [];

            console.log(prettyLog(this.serviceName, sport, desc, games.length));

            const prefix = `${this.serviceName} ${sport}`;
            const order = getOrder(desc);

            for (const gm of games) {
                const base = { sport, desc, gameNum: gm.GameNum, periodNumber: gm.PeriodNumber, status: gm.Status, periodType: gm.PeriodDescription, team1: gm.Team1ID, team2: gm.Team2ID };

                if (gm.SpreadAdj1) {
                    const points = Number(gm.Spread);
                    const odds = Number(gm.SpreadAdj1);
                    const keyName = `${prefix} ${gm.Team1ID} ${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "S", points, odds };
                }
                if (gm.SpreadAdj2) {
                    const points = Number(gm.Spread);
                    const odds = Number(gm.SpreadAdj2);
                    const keyName = `${prefix} ${gm.Team2ID} ${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "S", points, odds };
                }
                if (gm.MoneyLine1) {
                    const odds = Number(gm.MoneyLine1);
                    const keyName = `${prefix} ${gm.Team1ID} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "M", points: 0, odds };
                }
                if (gm.MoneyLine2) {
                    const odds = Number(gm.MoneyLine2);
                    const keyName = `${prefix} ${gm.Team2ID} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "M", points: 0, odds };
                }
                if (gm.MoneyLineDraw) {
                    const odds = Number(gm.MoneyLineDraw);
                    const keyName = `${prefix} ${gm.Team1ID} vrs ${gm.Team2ID} Draw ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "M", points: 0, odds };
                }
                if (gm.TtlPtsAdj1) {
                    const points = Number(gm.TotalPoints);
                    const odds = Number(gm.TtlPtsAdj1);
                    const title = gm.Team1ID == gm.Team2ID ? gm.Team1ID : `${gm.Team1ID} vrs ${gm.Team2ID}`;
                    const keyName = `${prefix} ${title} o${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points: -points, odds };
                }
                if (gm.TtlPtsAdj2) {
                    const points = Number(gm.TotalPoints);
                    const odds = Number(gm.TtlPtsAdj2);
                    const title = gm.Team1ID == gm.Team2ID ? gm.Team1ID : `${gm.Team1ID} vrs ${gm.Team2ID}`;
                    const keyName = `${prefix} ${title} u${points} ${odds > 0 ? "+" : ""}${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points, odds };
                }
                if (gm.Team1TtlPtsAdj1) {
                    const points = Number(gm.Team1TotalPoints);
                    const odds = Number(gm.Team1TtlPtsAdj1);
                    const keyName = `${prefix} ${gm.Team1ID} Team totals o${points} ${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points: -points, odds };
                }
                if (gm.Team1TtlPtsAdj2) {
                    const points = Number(gm.Team1TotalPoints);
                    const odds = Number(gm.Team1TtlPtsAdj2);
                    const keyName = `${prefix} ${gm.Team1ID} Team totals u${points} ${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points, odds };
                }
                if (gm.Team2TtlPtsAdj1) {
                    const points = Number(gm.Team2TotalPoints);
                    const odds = Number(gm.Team2TtlPtsAdj1);
                    const keyName = `${prefix} ${gm.Team2ID} Team totals o${points} ${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points: -points, odds };
                }
                if (gm.Team2TtlPtsAdj2) {
                    const points = Number(gm.Team2TotalPoints);
                    const odds = Number(gm.Team2TtlPtsAdj2);
                    const keyName = `${prefix} ${gm.Team2ID} Team totals u${points} ${odds}`;
                    this.matches[keyName] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points, odds };
                }

            }

            if (desc.toLowerCase().includes("prop") || desc.toLowerCase().includes("live")) return true;
            if (!["NBA", "WNBA", "NFL", "MLB", "MiLB", "NHL"].includes(sport)) return true;

            for (const gm of games) {
                const cleanedGpd = cleanGpd(gm.PeriodDescription);
                const cleanedVtm = cleanTeamName(gm.Team1ID);
                const cleanedHtm = cleanTeamName(gm.Team2ID);
                const [isNormalizedVtm, normalizedVtm] = getFullName(sport, cleanedVtm);
                const [isNormalizedHtm, normalizedHtm] = getFullName(sport, cleanedHtm);

                const teamNames = { vtm: normalizedVtm, htm: normalizedHtm };
                const isNormalized = { vtm: isNormalizedVtm, htm: isNormalizedHtm };
                const base = { sport, desc, gameNum: gm.GameNum, periodNumber: gm.PeriodNumber, status: gm.Status, periodType: gm.PeriodDescription, team1: gm.Team1ID, team2: gm.Team2ID };

                let data = { vtm: {}, htm: {} }
                if (gm.SpreadAdj1) data["vtm"]["sprd"] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "S", points: gm.Spread, odds: gm.SpreadAdj1 };
                if (gm.SpreadAdj2) data["htm"]["sprd"] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "S", points: gm.Spread, odds: gm.SpreadAdj2 };
                if (gm.MoneyLine1) data["vtm"]["ml"] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "M", points: 0, odds: gm.MoneyLine1 };
                if (gm.MoneyLine2) data["htm"]["ml"] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "M", points: 0, odds: gm.MoneyLine2 };
                if (gm.MoneyLineDraw) data["vtm"]["draw"] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "M", points: 0, odds: gm.MoneyLineDraw };
                if (gm.MoneyLineDraw) data["htm"]["draw"] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "M", points: 0, odds: gm.MoneyLineDraw };
                if (gm.TtlPtsAdj1) data["vtm"]["to"] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points: -gm.TotalPoints, odds: gm.TtlPtsAdj1 };
                if (gm.TtlPtsAdj1) data["htm"]["to"] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points: -gm.TotalPoints, odds: gm.TtlPtsAdj1 };
                if (gm.TtlPtsAdj2) data["vtm"]["tu"] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points: gm.TotalPoints, odds: gm.TtlPtsAdj2 };
                if (gm.TtlPtsAdj2) data["htm"]["tu"] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points: gm.TotalPoints, odds: gm.TtlPtsAdj2 };
                if (gm.Team1TtlPtsAdj1) data["vtm"]["tto"] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points: -gm.Team1TotalPoints, odds: gm.Team1TtlPtsAdj1 };
                if (gm.Team1TtlPtsAdj2) data["vtm"]["ttu"] = { ...base, chosenTeamID: gm.Team1ID, wagerType: "L", points: gm.Team1TotalPoints, odds: gm.Team1TtlPtsAdj2 };
                if (gm.Team2TtlPtsAdj1) data["htm"]["tto"] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points: -gm.Team2TotalPoints, odds: gm.Team2TtlPtsAdj1 };
                if (gm.Team2TtlPtsAdj2) data["htm"]["ttu"] = { ...base, chosenTeamID: gm.Team2ID, wagerType: "L", points: gm.Team2TotalPoints, odds: gm.Team2TtlPtsAdj2 };

                for (const [key, value] of Object.entries(data)) {
                    const teamName = teamNames[key];
                    if (!isNormalized[key]) {
                        unNormalizedTeams.push(teamName);
                        continue;
                    }

                    if (!this.globalMatches[teamName]) this.globalMatches[teamName] = {};
                    if (!this.globalMatches[teamName][cleanedGpd]) this.globalMatches[teamName][cleanedGpd] = {};

                    for (const [k, v] of Object.entries(value)) {
                        if (!this.uids.includes(`${teamName}-${cleanedGpd}-${k}`) && v.odds != "") {
                            this.globalMatches[teamName][cleanedGpd][k] = v;
                            this.uids.push(`${teamName}-${cleanedGpd}-${k}`);
                        }
                    }
                }
            }

            return true;

        } catch (error) {
            console.log(this.serviceName, error, league);
        }
    }
    async userLogin(account) {
        try {
            const response = await fetch(`https://strikerich.ag/cloud/api/System/authenticateCustomer`,
                {
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
    async getUserInfo(account) {
        try {
            const response = await fetch("https://strikerich.ag/cloud/api/Customer/getAccountInfo", {
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
            balance = result?.accountInfo?.CurrentBalance;
            account.available = result?.accountInfo?.AvailableBalance;
            account.atrisk = result?.accountInfo?.PendingWagerBalance;
            if (account.balance) account.balance /= 100;
            if (account.atrisk) account.atrisk /= 100;
            if (account.balance == undefined || account.available == undefined || account.atrisk == undefined) account.code = null;

        } catch (error) {
            account.code = null;
            console.log(this.serviceName, error);
        }
        return account;
    }
    async userManager() {
        while (1) {
            for (let account of this.accounts) {
                account = await this.getUserInfo(account);
                if (!account.code) account = await this.userLogin(account);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    async main() {
        while (1) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (this.accounts.length == 0) continue;

            let account = this.accounts[0];

            const leagues = await this.getLeagues(account.username, account.code);

            this.uids = [];
            for (const league of leagues) {
                const isok = await this.getLeagueMatches(league, account.username, account.code);
                await new Promise(resolve => setTimeout(resolve, isok ? 100 : 5000));
            }

            this.isReady = true;
        }
    }
}

module.exports = Strikerich;
