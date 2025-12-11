const express = require('express');
const router = express.Router();
const GeneralCtr = require("../controllers/general");
module.exports = (service) => {
    const generalCtr = new GeneralCtr(service);
    router.get('/skins', (req, res, next)=>generalCtr.skins(req, res, next));
    router.get('/teams', (req, res, next)=>generalCtr.teams(req, res, next));
    router.post('/bet', (req, res, next)=>generalCtr.bet(req, res, next));
    router.get('/signals', (req, res, next)=>generalCtr.getSignals(req, res, next));
    router.post('/prebet', (req, res, next)=>generalCtr.prebet(req, res, next));
    router.post('/confirmbet', (req, res, next)=>generalCtr.confirmbet(req, res, next));
    router.get('/history', (req, res, next)=>generalCtr.getHistory(req, res, next));
    router.post('/account/create', (req, res, next)=>generalCtr.upsertAccount(req, res, next, "create"));
    router.post('/account/update', (req, res, next)=>generalCtr.upsertAccount(req, res, next, "update"));
    router.put('/account/delete', (req, res, next)=>generalCtr.deleteAccount(req, res, next));
    router.get('/account', (req, res, next)=>generalCtr.getAccounts(req, res, next));
    return router;
}
