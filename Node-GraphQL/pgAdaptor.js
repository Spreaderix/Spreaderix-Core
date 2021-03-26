const pgPromise = require('pg-promise');

const pgp = pgPromise({}); // Empty object means no additional config required

const config = {
    host: "localhost",
    port: "5432",
    database: "spreaderix",
    user: "postgres",
    password: "admin"
};

const db = pgp(config);

exports.db = db;