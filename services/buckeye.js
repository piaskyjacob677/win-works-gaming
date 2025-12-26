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
    async getLeagues(customerID, code, agent) {
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
                "body": `customerID=${customerID}+++&wagerType=Straight&office=PREMIER&placeLateFlag=false&operation=Get_SportsLeagues&RRO=1&agentSite=0`,
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
    async getLeagueMatches(league, customerID, code, agent) {
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
                "body": `customerID=${customerID}+++&operation=Get_LeagueLines2&sportType=${sportType}&sportSubType=${sportSubType}&period=${period_0}&hourFilter=0&propDescription=&wagerType=Straight&keyword=&office=PREMIER&correlationID=&periodNumber=${periodNumber}&periods=0&rotOrder=0&placeLateFlag=false&RRO=1&agentSite=0`,
                "method": "POST"
            });

            const data = await response.json();
            const games = data?.Lines;

            for (const gm of games) {
                const { GameNum, PeriodNumber, Status, PeriodDescription, SportType, Team1ID, Team2ID, FavoredTeamID, Team1RotNum, Team2RotNum, ShortName1, ShortName2 } = gm;

                let team1 = Team1ID;
                let team2 = Team2ID;
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

                const period = getPeriod(sport + " " + desc + " " + Team1ID + " " + Team2ID);
                const order = period.startsWith("1") ? 1000 : period.startsWith("2") ? 2000 : period.startsWith("3") ? 3000 : period.startsWith("4") ? 4000 : 0;

                const base = { sport, desc, GameNum, PeriodNumber, Status, PeriodDescription, Team1ID, Team2ID, Team1RotNum, Team2RotNum, hasRotNumber: this.hasRotNumber, is_props };

                if (gm.MoneyLine1) {
                    const odds = gm.MoneyLine1;
                    const decimal = gm.MoneyLineDecimal1;
                    const numerator = gm.MoneyLineNumerator1;
                    const denominator = gm.MoneyLineDenominator1;
                    const keyName = `${sport} [${Team1RotNum}] ${team1} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team1RotNum} ${ShortName1} ${suffix} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, team: 1, wagerType: "M", points: 0, odds, decimal, numerator, denominator, description, suffix, order: order + 1 };
                }
                if (gm.MoneyLine2) {
                    const odds = gm.MoneyLine2;
                    const decimal = gm.MoneyLineDecimal2;
                    const numerator = gm.MoneyLineNumerator2;
                    const denominator = gm.MoneyLineDenominator2;
                    const keyName = `${sport} [${Team2RotNum}] ${team2} ${period} ml`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team2RotNum} ${ShortName2} ${suffix} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, team: 2, wagerType: "M", points: 0, odds, decimal, numerator, denominator, description, suffix, order: order + 2 };
                }
                if (gm.SpreadAdj1) {
                    const points = Team1ID == FavoredTeamID ? gm.Spread : -gm.Spread;
                    const odds = gm.SpreadAdj1;
                    const decimal = gm.SpreadDecimal1;
                    const numerator = gm.SpreadNumerator1;
                    const denominator = gm.SpreadDenominator1;
                    const keyName = `${sport} [${Team1RotNum}] ${team1} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points > 0 ? "+" + points.toString() : points} ${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team1RotNum} ${ShortName1} ${suffix.replace(".5", "&#189").replace(" ", "; ")} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, team: 1, wagerType: "S", points, odds, decimal, numerator, denominator, description, suffix, order: order + 3 };
                }
                if (gm.SpreadAdj2) {
                    const points = Team2ID == FavoredTeamID ? gm.Spread : -gm.Spread;
                    const odds = gm.SpreadAdj2;
                    const decimal = gm.SpreadDecimal2;
                    const numerator = gm.SpreadNumerator2;
                    const denominator = gm.SpreadDenominator2;
                    const keyName = `${sport} [${Team2RotNum}] ${team2} ${period} spread`;
                    const suffix = `${points == 0 ? "PK" : points > 0 ? "+" + points.toString() : points} ${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team2RotNum} ${ShortName2} ${suffix.replace(".5", "&#189").replace(" ", "; ")} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, team: 2, wagerType: "S", points, odds, decimal, numerator, denominator, description, suffix, order: order + 4 };
                }
                if (gm.TtlPtsAdj1) {
                    const points = gm.TotalPoints;
                    const odds = gm.TtlPtsAdj1;
                    const decimal = gm.TtlPointsDecimal1;
                    const numerator = gm.TtlPointsNumerator1;
                    const denominator = gm.TtlPointsDenominator1;
                    const keyName = `${sport} [${Team1RotNum}] ${team1}/${team2} ${period} to`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team1RotNum} ${ShortName1}/${ShortName2} O ${suffix.replace(".5", "&#189").replace(" ", "; ")} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, totalOU: "O", team: 1, wagerType: "L", points: -points, odds, decimal, numerator, denominator, description, suffix, order: order + 5 };
                }
                if (gm.TtlPtsAdj2) {
                    const points = gm.TotalPoints;
                    const odds = gm.TtlPtsAdj2;
                    const decimal = gm.TtlPointsDecimal2;
                    const numerator = gm.TtlPointsNumerator2;
                    const denominator = gm.TtlPointsDenominator2;
                    const keyName = `${sport} [${Team2RotNum}] ${team1}/${team2} ${period} tu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team2RotNum} ${ShortName1}/${ShortName2} U ${suffix.replace(".5", "&#189").replace(" ", "; ")} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, totalOU: "U", team: 2, wagerType: "L", points, odds, decimal, numerator, denominator, description, suffix, order: order + 6 };
                }
                if (gm.MoneyLineDraw) {
                    const odds = gm.MoneyLineDraw;
                    const decimal = gm.MoneyLineDecimalDraw;
                    const numerator = gm.MoneyLineNumeratorDraw;
                    const denominator = gm.MoneyLineDenominatorDraw;
                    const keyName = `${sport} [${Team1RotNum}] ${team1} : ${team2} ${period} draw`;
                    const suffix = `${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team1RotNum} Draw (${Team1ID} vs ${Team2ID}) ${suffix} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, team: 1, wagerType: "M", points: 0, odds, decimal, numerator, denominator, description, suffix, order: order + 7 };
                }
                if (gm.Team1TtlPtsAdj1) {
                    const points = gm.Team1TotalPoints;
                    const odds = gm.Team1TtlPtsAdj1;
                    const decimal = gm.Team1TtlPtsDecimal1;
                    const numerator = gm.Team1TtlPtsNumerator1;
                    const denominator = gm.Team1TtlPtsDenominator1;
                    const keyName = `${sport} [${Team1RotNum}] ${team1} ${period} tto`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team1RotNum} ${ShortName1} O ${suffix.replace(".5", "&#189").replace(" ", "; ")} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, totalOU: "O", team: 1, wagerType: "E", points: -points, odds, decimal, numerator, denominator, description, suffix, order: order + 8 };
                }
                if (gm.Team1TtlPtsAdj2) {
                    const points = gm.Team1TotalPoints;
                    const odds = gm.Team1TtlPtsAdj2;
                    const decimal = gm.Team1TtlPtsDecimal2;
                    const numerator = gm.Team1TtlPtsNumerator2;
                    const denominator = gm.Team1TtlPtsDenominator2;
                    const keyName = `${sport} [${Team1RotNum}] ${team1} ${period} ttu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team1RotNum} ${ShortName1} U ${suffix.replace(".5", "&#189").replace(" ", "; ")} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, totalOU: "U", team: 1, wagerType: "E", points, odds, decimal, numerator, denominator, description, suffix, order: order + 8 };
                }
                if (gm.Team2TtlPtsAdj1) {
                    const points = gm.Team2TotalPoints;
                    const odds = gm.Team2TtlPtsAdj1;
                    const decimal = gm.Team2TtlPtsDecimal1;
                    const numerator = gm.Team2TtlPtsNumerator1;
                    const denominator = gm.Team2TtlPtsDenominator1;
                    const keyName = `${sport} [${Team2RotNum}] ${team2} ${period} tto`;
                    const suffix = `${-points} ${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team2RotNum} ${ShortName2} O ${suffix.replace(".5", "&#189").replace(" ", "; ")} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, totalOU: "O", team: 2, wagerType: "E", points: -points, odds, decimal, numerator, denominator, description, suffix, order: order + 9 };
                }
                if (gm.Team2TtlPtsAdj2) {
                    const points = gm.Team2TotalPoints;
                    const odds = gm.Team2TtlPtsAdj2;
                    const decimal = gm.Team2TtlPtsDecimal2;
                    const numerator = gm.Team2TtlPtsNumerator2;
                    const denominator = gm.Team2TtlPtsDenominator2;
                    const keyName = `${sport} [${Team2RotNum}] ${team2} ${period} ttu`;
                    const suffix = `${points} ${odds > 0 ? "+" : ""}${odds}`;
                    const description = `${SportType.trim()} #${Team2RotNum} ${ShortName2} U ${suffix.replace(".5", "&#189").replace(" ", "; ")} - For ${PeriodDescription} `;
                    this.matches[keyName] = { ...base, totalOU: "U", team: 2, wagerType: "E", points, odds, decimal, numerator, denominator, description, suffix, order: order + 9 };
                }
            }

            console.log(prettyLog(this.serviceName, sport, desc, games.length));
            return true;

        } catch (error) {
            console.log(this.serviceName, error, league);
        }
    }
    async checkWagerLineMulti(account, betslip, stake, agent) {
        const { customerID, Store, CustProfile, code, Cookie } = account;
        const { GameNum, PeriodNumber, Status, PeriodDescription, description, wagerType } = betslip;

        const v = Math.round(stake * (Math.abs(betslip.odds) / 100));
        let risk = v, win = stake;
        if (betslip.odds >= 100) risk = stake, win = v;

        const c = {
            position: Math.floor(1e8 * Math.random() + 1),
            gameNum: GameNum,
            contestantNum: 0,
            periodNumber: PeriodNumber,
            store: Store.trim(),
            status: Status,
            profile: CustProfile.trim(),
            periodType: PeriodDescription,
            description: description,
            risk: risk.toString(),
            win: win.toString(),
            wagerType: wagerType
        };

        try {
            const response = await fetch("https://strikerich.ag/cloud/api/WagerSport/checkWagerLineMulti", {
                "agent": agent,
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${code}`,
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-requested-with": "XMLHttpRequest",
                    "cookie": Cookie,
                    "Referer": "https://strikerich.ag/sports.html?v=1766634763227"
                },
                "body": `list=${encodeURIComponent(JSON.stringify([c]))}&token=${code}&customerID=${customerID}+++&operation=checkWagerLineMulti&RRO=0&agentSite=0`,
                "method": "POST"
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(this.serviceName, error);
        }
    }
    async insertWagerStraight(account, betslip, stake, res, agent) {
        const { AgentID, CurrencyCode, CreditAcctFlag, customerID, Store, Office, PercentBook, BaseballAction, CustProfile, code, Cookie } = account;
        const { GameNum, PeriodNumber, Status, team, suffix, PeriodDescription, description, wagerType, Team1ID, Team2ID, Team1RotNum, Team2RotNum, points, odds, decimal, numerator, denominator, totalOU } = betslip;

        const val = Math.round(stake * (Math.abs(betslip.odds) / 100));
        let risk = val, win = stake;
        if (betslip.odds >= 100) risk = stake, win = val;

        console.log(betslip.odds, risk, win);

        const v = wagerType !== "M" ? "" : "Y";
        const h = wagerType !== "M" ? "" : "Y";

        const B = wagerType === "M" ? `${odds > 0 ? "+" : ""}${odds}` : `${points > 0 ? "+" : ""}${points}`;

        const date = new Date().toISOString().split("T")[0];

        const S = {
            date: date,
            minPicks: 1,
            totalPicks: 1,
            maxPayOut: 0,
            wagerCount: 1,
            riskAmount: risk.toString(),
            winAmount: win.toString(),
            description: description,
            lineType: wagerType,
            team: team,
            freePlay: "N",
            agentID: AgentID,
            currencyCode: CurrencyCode,
            creditAcctFlag: CreditAcctFlag,
            playNumber: 1
        };
        const A = {
            team1: Team1ID,
            team2: Team2ID,
            rot1: Team1RotNum,
            rot2: Team2RotNum,
            line: suffix.replace(".5", "½"),
            buy: false,
            point: 0
        };
        let c = {
            customerID: customerID,
            docNum: Math.floor(1e8 * Math.random() + 1),
            wagerType: wagerType,
            gameNum: GameNum,
            wagerCount: 1,
            gameDate: res?.LIST?.[0]?.GameDateTime,
            buyingFlag: res?.LIST?.[0]?.PreventPointBuyingFlag,
            extraGames: "N",
            sportType: res?.LIST?.[0]?.SportType,
            sportSubType: res?.LIST?.[0]?.SportSubType,
            lineType: wagerType,
            adjSpread: wagerType === "S" ? `${points > 0 ? "+" : ""}${points}` : 0,
            adjTotal: wagerType === "L" || wagerType === "E" ? points : 0,
            priceType: "A",
            finalMoney: odds,
            finalDecimal: decimal,
            finalNumerator: numerator,
            finalDenominator: denominator,
            chosenTeamID: team === 1 ? Team1ID : Team2ID,
            riskAmount: risk.toString(),
            winAmount: win.toString(),
            store: Store,
            office: Office,
            custProfile: CustProfile,
            periodNumber: PeriodNumber,
            periodDescription: PeriodDescription,
            oddsFlag: "Y" === v && "Y" === h ? "N" : "Y",
            listedPitcher1: res?.LIST?.[0]?.ListedPitcher1,
            pitcher1ReqFlag: v,
            listedPitcher2: res?.LIST?.[0]?.ListedPitcher2,
            pitcher2ReqFlag: h,
            percentBook: PercentBook,
            volumeAmount: (parseFloat(win) > parseFloat(risk) || 0 == parseInt(win) ? risk : win) * 100,
            currencyCode: CurrencyCode,
            date: date,
            agentID: AgentID,
            easternLine: 0,
            origPrice: odds,
            origDecimal: decimal,
            origNumerator: numerator,
            origDenominator: denominator,
            creditAcctFlag: CreditAcctFlag,
            wager: S,
            itemNumber: 1,
            wagerNumber: 0,
            origSpread: B,
            origTotal: B,
            origMoney: 1,
            extra: A,
            status: Status,
            printing: false
        };
        if (BaseballAction === "Fixed") {
            c.oddsFlag = "N";
            c.pitcher1ReqFlag = "N";
            c.pitcher2ReqFlag = "N";
        }
        if (totalOU) {
            c.totalPointsOU = totalOU;
        }

        try {
            const response = await fetch("https://strikerich.ag/cloud/api/WagerSport/insertWagerStraight", {
                "agent": agent,
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${code}`,
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-requested-with": "XMLHttpRequest",
                    "cookie": Cookie,
                    "Referer": "https://strikerich.ag/sports.html?v=1766634763227"
                },
                "body": `customerID=${customerID}+++&list=${encodeURIComponent(JSON.stringify([c]))}&agentView=false&operation=insertWagerStraight&agToken=&delay=${encodeURIComponent(JSON.stringify(res?.DELAY))}&agentSite=0`,
                "method": "POST"
            });
            const data = await response.json();
            console.log(data);
            return data;
        } catch (error) {
            console.error(this.serviceName, error);
        }
    }
    async placebet(account, betslip, stake, pointsT, oddsT, agent) {
        if (account.code == null) return { service: this.serviceName, account, msg: "Token expired" };

        const res = await this.checkWagerLineMulti(account, betslip, stake, agent);
        if (!res) return { service: this.serviceName, account, msg: "Check wager line multi failed" };

        const result = await this.insertWagerStraight(account, betslip, stake, res, agent);
        if (result?.STATUS?.test == "ok") return { service: this.serviceName, account, stake: stake };
        if (result?.STATUS?.MSG && result?.STATUS?.TYPE) return { service: this.serviceName, account, msg: `Type ${result?.STATUS?.TYPE}: ${result?.STATUS?.MSG}` };
        return { service: this.serviceName, account, msg: "Insert wager straight failed" };
    }
    async place(betslip, stake, pointsT = 0, oddsT = 10) {
        let outputs = [];
        for (let account of this.accounts) {
            await notify(`${this.serviceName} - ${account.username} start placing bet`, "7807642696");

            const agent = account.proxy_url ? new HttpsProxyAgent(account.proxy_url) : null;
            const result = await this.placebet(account, betslip, stake, pointsT, oddsT, agent);

            await notify(`${this.serviceName} - ${account.username} ${result.msg ? `failed: ${result.msg}` : `success: ${result.stake}`}`, "7807642696");
            outputs.push(result);
            stake -= result.stake || 0;
            if (stake <= 0) break;
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
            const { username, code } = account;
            const response = await fetch("https://strikerich.ag/cloud/api/Customer/getAccountInfo", {
                "agent": agent,
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${code}`,
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
                "body": `customerID=${username}_0&token=${code}&access_token=${code}&operation=getAccountInfo&RRO=0&agentSite=0`,
                "method": "POST"
            });
            const result = await response.json();
            const accountInfo = result?.accountInfo;
            const ips = result?.ips;
            if (accountInfo) {
                account.balance = accountInfo.CurrentBalance / 100;
                account.available = accountInfo.AvailableBalance;
                account.atrisk = accountInfo.PendingWagerBalance / 100;
                account.customerID = accountInfo.customerID;
                account.AgentID = accountInfo.AgentID;
                account.CurrencyCode = accountInfo.CurrencyCode;
                account.CreditAcctFlag = accountInfo.CreditAcctFlag;
                account.Store = accountInfo.Store;
                account.Office = accountInfo.Office;
                account.CustProfile = accountInfo.CustProfile;
                account.PercentBook = accountInfo.PercentBook;
                account.BaseballAction = accountInfo.BaseballAction;
            }

            if (ips) {
                account.Cookie = ips.Cookie;
            }
            else {
                account.code = null;
            }

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
