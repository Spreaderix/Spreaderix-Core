// @ts-check

import express from 'express'; // http://expressjs.com/
import bodyParser from 'body-parser';
import Log4js from 'log4js'; // https://www.npmjs.com/package/log4js

import { DiContainer } from 'bubble-di'; // https://www.npmjs.com/package/bubble-di
import Pgp from 'pg-promise'; // https://www.npmjs.com/package/pg-promise
import { Spreaderix } from './spreaderix.js';

import jwt from 'jsonwebtoken';

DiContainer.setContainer(new DiContainer());

DiContainer.getContainer().registerInstance('config', {
    WebServer: {
        PORT: 10001
    },
    Database: {
        ConnectionString: 'postgres://postgres:admin@localhost:5432/spreaderix'
    },
    Log: {
        Level: Log4js.levels.ALL.levelStr
    }
});

DiContainer.getContainer().register('logger', {
    dependencies: ['config'],
    factoryMethod: (config) => {
        Log4js.configure({
            appenders: {
                console: { type: 'console' },
                file: { type: 'file', filename: 'spreaderix.log' }
            },
            categories: {
                default: { appenders: ['console'], level: config.Log.Level }
            }
        });

        const logger = Log4js.getLogger();
        logger.trace('created logger');
        return logger;
    }
});

DiContainer.getContainer().register('webserver', {
    dependencies: ['config', 'logger'],
    factoryMethod: (config, logger) => {
        // registered as singleton (resolve retrieves this instance created here)
        logger.trace(`creating webserver on port ${config.WebServer.PORT}`);
        const app = express();
        app.use(bodyParser.json());
        app.use(Log4js.connectLogger(logger, { level: 'auto' }));

        // middleware function verifying token
        app.use(function(req, res, next) {
            const path = req.path;
            console.log(path);
            if(path == '/users' || path == '/sessions' || path == 'verification'){ 
                next();
            }else{
                const token = req.headers['x-json-web-token'];
    
                if (!token) {
                    res.status(401).send({ auth: false, message: 'Token not provided.' });
                } else {
                    jwt.verify(token.toString(), 'secretKeyValue', async (error, decoded) => {
                        if (error) {
                            res.status(500).send({ auth: false, message: 'Token can not be verified.' });
                        } else {
                            next();
                        }
                    });
                }
            }
        })
        return app;
    }
});

DiContainer.getContainer().register('database', {
    dependencies: ['config', 'logger'],
    factoryMethod: (config, logger) => {
        logger.trace('creating database connection');
        const db = Pgp({})(config.Database.ConnectionString);
        return db;
    }
});

DiContainer.getContainer().register('spreaderix', {
    dependencies: ['config', 'logger', 'webserver', 'database'],
    factoryMethod: (config, logger, webserver, database) => {
        logger.trace('creating spreaderix');
        const spreaderix = new Spreaderix(config, logger, webserver, database);
        return spreaderix;
    }
});

// console.log(`started in environment: ${DiContainer.getContainer().resolve('webserver').settings.env}`);

DiContainer.getContainer().resolve('spreaderix').start();
