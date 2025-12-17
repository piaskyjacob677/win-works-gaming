const { resolveApp } = require("../web/utils/path.js");
const periods = require(resolveApp("./constants/periods.json"));
const aliases = require(resolveApp("./constants/aliases.json"));
const props = require(resolveApp("./constants/props.json"))

exports.prettyLog = (service, sportCode, description, gameCount) => {
    const timestamp = new Date().toLocaleString().padEnd(22);
    service = service.padEnd(12);
    sportCode = sportCode.padEnd(5);
    description = description.padEnd(60);
    gameCount = String(gameCount).padStart(3);

    return `${timestamp} │ ${service} │ ${sportCode} │ ${description} │ ${gameCount}`;
}

exports.leagueNameCleaner = (sport, desc) => {
    const batches = [
        ["NFL", "national football league"],
        ["CFB", "college football", "ncaa football", "ncaafb", "ncaa fb", "ncaaf"],
        ["WNBA", "women's national basketball association"],
        ["NBA", "national basketball association"],
        ["CBB", "college basketball", "ncaa basketball", "ncaabb", "ncaa bb", "ncaab"],
        ["MLB", "major league baseball"],
        ["NHL", "national hockey league"],
    ]

    let content = sport + " " + desc;

    if (new RegExp("way|win|double|alter|adjust|score|margin|next|time|most", "i").test(content)) return;
    
    let is_valid = false;
    for (const batch of batches) {
        for (const value of batch) {
            if (new RegExp(value, "i").test(content)) {
                sport = batch[0];
                desc = desc.replace(new RegExp(value, "i"), "");
                is_valid = true;
            }
        }
    }
    if (!is_valid) return;
        
    desc = desc.replace(/^[\s-]+|[\s-]+$/g, "").replace(/^[\s(]+|[\s)]+$/g, "").trim();
    if (desc == "") desc = "game lines";
    if (new RegExp("day football|night football", "i").test(content)) content += " game lines";
    
    if (new RegExp("player props", "i").test(content)) {
        return { sport, desc: desc.toUpperCase()};
    }

    is_valid = false;
    for (const [key, values] of Object.entries(periods)) {
        if (new RegExp(values.join("|"), "i").test(content)) {
            is_valid = true;
            break;
        }
    }
    if (!is_valid) return;

    return { sport, desc: desc.toUpperCase() };
}

exports.getPeriod = (content) => {
    for (const [key, values] of Object.entries(periods)) {
        if (new RegExp(values.join("|"), "i").test(content)) {
            return key;
        }
    }
    return "ft";
}

exports.getFullName = (sport, team) => {
    const batches = aliases[sport] || [];
    for (const batch of batches) {
        if (new RegExp(batch.join("|"), "i").test(team)) {
            return batch[0];
        }
    }
    return null;
}

exports.teamNameCleaner = (team) => {
    team = team.replace(/\([A-Z]{1,3}\)/gi, "").replace(/[()]/gi, "");
    team = team.replace(/\b(team total|no ot|total goals|total points)\b/gi, "");

    for (const [key, values] of Object.entries(periods)) {
        team = team.replace(new RegExp(values.join("|"), "gi"), "");
    }
    team = team.replace("  ", " ").trim();
    return team;
}

exports.playerPropsCleaner = (sport, player) => {
    sport = sport == "CFB" ? "NFL" : sport == "CBB" ? "NBA" : sport == "WNBA" ? "NBA" : sport == "MiLB" ? "MLB" : sport;
    player = player.replace(new RegExp(" tot | total |:|-", "gi"), "").replace(/\s*\([A-Z]{2,5}\)/g, "");

    let replaced = false;

    const batches = props[sport] || [];
    for (const batch of batches) {
        for (const value of batch) {
            if (new RegExp(value, "i").test(player)) {
                player = player.replace(new RegExp(value, "i"), `@${batch[0]}`);
                replaced = true;
                break;
            }
        }
        if (replaced) break;
    }
    return player.replace(/\s+/g, " ").trim();
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
