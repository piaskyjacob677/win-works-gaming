require('dotenv').config();
const express = require("./config/express");
module.exports = (service) => {
    const { server } = express(service);
    server.listen(process.env.USER_PORT, (err) => {
        console.log(err || `Server running on port ${process.env.USER_PORT}`);
    });
}
