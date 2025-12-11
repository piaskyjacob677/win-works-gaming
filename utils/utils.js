const { resolveApp } = require("../web/utils/path.js");
const periods = require(resolveApp(`${process.env.DIR_DATA}/periods.json`));
const fixedAliases = require(resolveApp(`${process.env.DIR_DATA}/fixedAliases.json`));

exports.prettyLog = (service, sportCode, description, gameCount) => {
    const timestamp = new Date().toLocaleString().padEnd(22);
    service = service.padEnd(12);
    sportCode = sportCode.padEnd(5);
    description = description.padEnd(60);
    gameCount = String(gameCount).padStart(3);

    return `${timestamp} │ ${service} │ ${sportCode} │ ${description} │ ${gameCount}`;
}

exports.filterLeague = (sport, desc) => {
    const sportAliases = {
        "NFL": ["nfl", "national football league"],
        "CFB": ["cfb", "college football", "ncaa football", "ncaafb", "ncaa fb", "ncaaf"],
        "WNBA": ["wnba", "women's national basketball association"],
        "NBA": ["nba", "national basketball association"],
        "CBB": ["cbb", "college basketball", "ncaa basketball", "ncaabb", "ncaa bb", "ncaab"],
        "MLB": ["mlb", "major league baseball"],
        "NHL": ["nhl", "national hockey league"],
    }
    desc = desc.toLowerCase();
    const content = sport.toLowerCase() + " " + desc;

    if (["futures", "alternat", "adjusted", "live", "outright", "odds to win", "championship", "conference", "super", "regula"].some(word => content.includes(word))) return;

    let order = 0;
    const keys = ["props", "division", "series", "playoffs", "winner", "special", "year", "scorer", "player", "season"];
    for (const [index, key] of keys.entries()) {
        if (content.includes(key)) order = (index + 1) * 1000;
    }

    for (const [key, aliases] of Object.entries(sportAliases)) {
        if (aliases.some(alias => content.includes(alias))) {
            for (const alias of aliases) desc = desc.replace(alias, "");
            desc = desc.replace(/^[\s-]+|[\s-]+$/g, "").replace(/^[\s(]+|[\s)]+$/g, "").trim();
            if (desc == "") desc = "Game Lines";
            if (["bk", "basketball", "hk", "hockey", "bb", "baseball"].some(word => desc.includes(word))) return;
            return { sport: key, desc: desc.toUpperCase(), order };
        }
    }
}

exports.getPeriodOrder = (text, order) => {
    text = text.toLowerCase();
    const suffix = (["3 way", "3-way", "3way"].some(word => text.includes(word))) ? " 3-way" : "";

    let period = `ft${suffix}`;

    for (const [k, v] of Object.entries(periods)) {
        if (text.includes(k)) period = `${v}${suffix}`;
    }

    if (period == "ft") order += 0;
    else if (period.startsWith("1")) order += 1000;
    else if (period.startsWith("2")) order += 2000;
    else if (period.startsWith("3")) order += 3000;
    else order += 4000;

    return { period, matchOrder: order };
}

exports.getFullName = (sport, team) => {
    const aliases = fixedAliases[sport] || [];
    for (const batch of aliases) {
        for (const name of batch) {
            if (name.toLowerCase() == team) {
                return batch[0];
            }
        }
    }
}

exports.cleanTeamName = (team) => {
    team = team.toLowerCase();
    team = team.replace(/\([a-z]{1,3}\)/g, "").replace(/[()]/g, "").trim();
    team = team.replace(/\b(3way|3 way|3-way|team total|no ot|total goals|3qtr)\b/g, "").trim();

    for (const key of Object.keys(periods)) {
        if (team.includes(key)) {
            return team.replace(key, "").trim();
        }
    }
    return team;
}

exports.toleranceCheck = (bookPoints, bookOdds, inputPoints, inputOdds, pointsT, oddsT, marketName) => {
    bookPoints = parseFloat(bookPoints);
    bookOdds = parseFloat(bookOdds);
    inputPoints = parseFloat(inputPoints);
    inputOdds = parseFloat(inputOdds);

    bookOdds = bookOdds >= 100 ? bookOdds - 100 : bookOdds + 100;
    inputOdds = inputOdds >= 100 ? inputOdds - 100 : inputOdds + 100;

    if ((inputOdds - bookOdds) > oddsT) return false;

    if (marketName == "total") {
        if (inputPoints - bookPoints > pointsT) return false;
    }
    else {
        if (inputPoints > bookPoints && Math.abs(bookPoints - inputPoints) > pointsT) return false;
    }

    return true;
}
