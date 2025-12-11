const dotenv = require('dotenv');
dotenv.config({ path: '.env-8089' });

const Abcwager = require('./services/abcwager.js');
const Action = require('./services/action.js');
const Betwindycity = require('./services/betwindycity.js');
const Fesster = require('./services/fesster.js');
const Godds = require('./services/godds.js');
const Highroller = require('./services/highroller.js');

const { resolveApp } = require("./web/utils/path.js");
const accounts = require(resolveApp(`${process.env.DIR_DATA}/accounts.json`));

class Server {
    constructor() {
        this.services = [
            new Abcwager(),
            new Action(),
            new Fesster(),
            new Godds(),
            new Betwindycity(),
            new Highroller(),
        ];
    }
    init() {
        for (const service of this.services) {
            service.accounts = accounts[service.serviceName];
            service.userManager();
            service.scraper();
        }
    }
}

const server = new Server();
server.init();

require("./web/index.js")(server)
