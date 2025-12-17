const fs = require('fs');

const { leagueNameCleaner, getPeriod, getFullName, teamNameCleaner, playerPropsCleaner, toleranceCheck, prettyLog } = require("./utils/utils.js");

console.log(playerPropsCleaner("NBA", "L. MARKKANEN (UTH) TOT POINTS"));

// for (const service of ['1bv', 'abcwager', 'action', 'fesster', 'highroller', 'betwindycity']) {
//     const data = JSON.parse(fs.readFileSync(`./events/8088/${service}.json`, 'utf8'));
//     const content = Object.keys(data).join('\n');
//     fs.writeFileSync(`./events/8088/${service}.txt`, content);
// }

