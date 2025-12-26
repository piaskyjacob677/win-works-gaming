const fetch = require("node-fetch");

async function checkWagerLineMulti(account, betslip, stake) {
  const { customerID, Store, CustProfile, token } = account;
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
      "headers": {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "authorization": `Bearer ${token}`,
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "priority": "u=0, i",
        "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "Referer": "https://strikerich.ag/sports.html?v=1766634763227"
      },
      "body": `list=${encodeURIComponent(JSON.stringify([c]))}&token=${token}&customerID=${customerID}+++&operation=checkWagerLineMulti&RRO=0&agentSite=0`,
      "method": "POST"
    });
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

async function insertWagerStraight(account, betslip, stake, res) {
  const { AgentID, CurrencyCode, CreditAcctFlag, customerID, Store, Office, PercentBook, BaseballAction, CustProfile, token } = account;
  const { GameNum, PeriodNumber, Status, team, suffix, PeriodDescription, description, wagerType, Team1ID, Team2ID, Team1RotNum, points, odds, decimal, numerator, denominator, totalOU } = betslip;

  const val = Math.round(stake * (Math.abs(betslip.odds) / 100));
  let risk = val, win = stake;
  if (betslip.odds >= 100) risk = stake, win = val;

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
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9",
      "authorization": `Bearer ${token}`,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest",
      "Referer": "https://strikerich.ag/sports.html?v=1766634763227"
    },
    "body": `customerID=${customerID}+++&list=${encodeURIComponent(JSON.stringify([c]))}&agentView=false&operation=insertWagerStraight&agToken=&delay=${encodeURIComponent(JSON.stringify(res?.DELAY))}&agentSite=0`,
    "method": "POST"
  });
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
}

checkWagerLineMulti(token);