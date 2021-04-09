// @ts-check

import Pgp from 'pg-promise'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createFilter } from 'odata-v4-pg';

export class Spreaderix {
    /**
     * @param {import("Log4js").Logger} logger
     * @param {import("express").Application} webserver
     * @param {Pgp.IDatabase} database
     */
    constructor (config, logger, webserver, database) {
        this.config = config;
        this.logger = logger;
        this.webserver = webserver;
        this.database = database;

        this.registerUserAuthentication();
        this.registerProjects();
        this.registerTables();
        this.registerDataManipulation();
    }

    registerUserAuthentication () {
        // TODO: remove SQL Injection possibilities (all operations)
        // TODO: does an error in database.one throws exception? (check for all db-operations)
        // TODO: verify if auth-field is required or can be implied by status code
        this.webserver.post('/users', async (req, res) => {
            try {
                const hashedPassword = bcrypt.hashSync(req.body.password, 8);
                const name = req.body.name;
                const email = req.body.email;

                // 1. create if not existing table users
                await this.database.none(`
                    CREATE TABLE IF NOT EXISTS USERS (
                        id serial primary key, 
                        name varchar(255), 
                        email varchar(255), 
                        passwordHash varchar(255) 
                    )`);

                // 2. check if email is existing
                const queryEmail = 'SELECT * FROM USERS WHERE EMAIL = \'' + email + '\'';
                const user = await this.database.manyOrNone(queryEmail);

                if (user.length > 0){ 
                    res.status(409).end();
                }else{
                    // 3. insert user
                    const query = 'INSERT INTO USERS (name, email, passwordhash) VALUES (\'' +
                        name + '\', \'' + email + '\', \'' + hashedPassword + '\') RETURNING id';

                    const userId = await this.database.one(query);
                    this.logger.info('created user with id=' + userId);

                    // 4. create token
                    const token = createToken(userId);

                    res.status(200).send({ auth: true, token: token });
                }
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        // TODO: remove sql injection
        this.webserver.post('/sessions', async (req, res) => {
            const email = req.body.email;
            console.log("email:", email);
            try {
                // check if user is exiting
                const query = 'SELECT * FROM USERS WHERE email=\'' + email + '\'';
                const result = await this.database.any(query);

                if (result.length === 0) {
                    res.status(404).end();
                } else if (result.length > 1){
                    res.status(500).end();  
                } else {
                    // get complete user
                    const user = await this.database.one(query);

                    // user found -> compare pw
                    const passwordIsValid = bcrypt.compareSync(req.body.password, user.passwordhash);
                    if (!passwordIsValid) {
                        res.status(401).send({ auth: false, token: null });
                    } else {
                        const token = createToken(user.id);
                        res.status(200).send({ auth: true, token: token });
                    }

                    res.status(200).json(result).end(); // todo: hier kommt man nie hin?
                }
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.post('/verification', async (req, res) => {
            const token = req.headers['x-json-web-token'];
            if (!token) {
                res.status(401).send({ auth: false, message: 'Token not provided.' });
            } else {
                jwt.verify(token.toString(), 'secretKeyValue', (error, decoded) => {
                    if (error) {
                        res.status(500).send({ auth: false, message: 'Token can not be verified.' });
                    } else {
                        res.status(200).end();
                    }
                });
            }
        });

        function createToken(userId){
            return jwt.sign({ id: userId }, 'secretKeyValue', { expiresIn: 86400 });
        }
    }
      
    registerProjects () {
        this.webserver.get('/simple/projects', async (req, res) => {
            try {
                res.status(200).json(await (
                    await this.database.any('SELECT schema_name FROM information_schema.schemata where schema_name not in ' +
                        '(\'information_schema\',\'public\',\'pg_catalog\',\'pg_toast\',\'pg_toast_temp_1\',\'pg_temp_1\');')
                ).map(x => x.schema_name)).end();
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.post('/simple/projects', async (req, res) => {
            try {
                const projectName = req.body.name;
                await this.database.none('CREATE SCHEMA IF NOT EXISTS $1:name', [projectName]);
                this.logger.info('created project ' + projectName);
                res.status(201).end();
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.delete('/simple/projects/:projectname', async (req, res) => {
            try {
                const projectName = req.params.projectname;
                await this.database.none('DROP SCHEMA IF EXISTS $1:name CASCADE', [projectName]);
                this.logger.info('deleted project ' + projectName);
                res.status(202).end();
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });
    }

    registerTables () {
        this.webserver.get('/simple/projects/:projectname/stores', async (req, res) => {
            try {
                const projectName = req.params.projectname;
                res.status(200).json(await (
                    await this.database.any('SELECT table_name FROM information_schema.tables WHERE table_schema = \'$1:value\'', [projectName])
                ).map(x => x.table_name)).end();
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.post('/simple/projects/:projectname/stores', async (req, res) => {
            try {
                const projectName = req.params.projectname;
                const tableName = req.body.name;
                const columns = req.body.columns;
                let columnString = '';
                if (Array.isArray(columns)) {
                    columns.forEach((value, index, array) => {
                        if (value && value.name && value.datatype) {
                            columnString = columnString + `, ${value.name} ${value.datatype}`;
                        }
                    });
                }
                const createStatementStart = Pgp.as.format('CREATE TABLE IF NOT EXISTS $1:name.$2:name', [projectName, tableName]);
                await this.database.none(`$1:raw (id serial primary key ${columnString})`, [createStatementStart]);
                this.logger.info('created table ' + projectName + '.' + tableName + ' with columns: id serial primary key, ' + columnString);
                res.status(201).end();
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.delete('/simple/projects/:projectname/stores/:storename', async (req, res) => {
            try {
                const projectName = req.params.projectname;
                const storeName = req.params.storename;
                await this.database.none('DROP TABLE IF EXISTS $1:name.$2:name', [projectName, storeName]);
                this.logger.info('deleted table ' + projectName + '.' + storeName);
                res.status(202).end();
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });
    }

    // TODO: check if some further app.METHODs make sense http://expressjs.com/en/4x/api.html#app.METHOD
    //       purge?
    registerDataManipulation () {
        this.webserver.get('/simple/projects/:projectname/stores/:storename', async (req, res) => {
            try {
                const projectName = req.params.projectname;
                const storeName = req.params.storename;
                res.status(200).json(await this.database.any('SELECT * FROM $1:name.$2:name', [projectName, storeName])).end();
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.get('/simple/projects/:projectname/stores/:storename/:id', async (req, res) => {
            try {
                const projectName = req.params.projectname;
                const storeName = req.params.storename;
                const idNumber = req.params.id;
                const result = await this.database.any('SELECT * FROM $1:name.$2:name WHERE id=' + idNumber, [projectName, storeName]);
                if (result.length === 0) {
                    res.status(404).end();
                } else {
                    res.status(200).json(result).end();
                }
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.get('/simple/projects/:projectname/odatafiltering/:storename', async (req, res) => {
            try {
                const filter = createFilter(req.query.$filter + '');
                const projectName = req.params.projectname;
                const storeName = req.params.storename;

                const query = 'SELECT * FROM ' + projectName + '.' + storeName + ' WHERE ';
                const result = await this.database.any(query + `${filter.where}`, filter.parameters);

                if (result.length === 0) {
                    res.status(404).end();
                } else {
                    res.status(200).json(result).end();
                }
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.post('/simple/projects/:projectname/stores/:storename', async (req, res) => {
            try {
                const projectName = req.params.projectname;
                const storeName = req.params.storename;
                const data = req.body || {};
                let newId;
                if (Object.keys(data).length > 0) {
                    newId = await this.database.one('INSERT INTO $1:name.$2:name ($3:name) VALUES ($3:csv) RETURNING id', [projectName, storeName, data]);
                } else {
                    newId = await this.database.one('INSERT INTO $1:name.$2:name default values RETURNING id', [projectName, storeName, data]);
                }
                this.logger.info('created record ' + projectName + '.' + storeName + ': id=' + newId);
                res.status(201).json(newId).end();
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.delete('/simple/projects/:projectname/stores/:storename/:id', async (req, res) => {
            try {
                const projectName = req.params.projectname;
                const storeName = req.params.storename;
                const idNumber = req.params.id;

                // check if id is exiting
                const result = await this.database.any('SELECT * FROM $1:name.$2:name WHERE id=' + idNumber, [projectName, storeName]);
                if (result.length === 0) {
                    // id not found
                    res.status(404).end();
                } else {
                    // do delete
                    await this.database.none('DELETE FROM $1:name.$2:name where id = $3:value', [projectName, storeName, idNumber]);
                    this.logger.info('deleted record ' + projectName + '.' + storeName);
                    res.status(202).end();
                }
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });

        this.webserver.patch('/simple/projects/:projectname/stores/:storename/:id', async (req, res) => {
            try {
                const projectName = req.params.projectname;
                const storeName = req.params.storename;
                const idNumber = req.params.id;
                const columns = req.body.columns || {};

                // check if id is exiting
                const resultIdExisting = await this.database.any('SELECT * FROM $1:name.$2:name WHERE id=' + idNumber, [projectName, storeName]);
                if (resultIdExisting.length === 0) {
                    // id not found
                    res.status(404).end();
                } else {
                    // do update
                    let columnString = '';
                    if (Array.isArray(columns)) {
                        columns.forEach((value, index, array) => {
                            if (value && value.column && value.value) {
                                if (columnString !== '') {
                                    columnString = columnString + `, ${value.column} = '${value.value}'`;
                                } else {
                                    columnString = columnString + ` ${value.column} = '${value.value}'`;
                                }
                            }
                        });
                    }
                    let id;
                    if (Object.keys(columns).length > 0) {
                        // id = await this.database.one('UPDATE $1:name.$2:name SET $3:name WHERE id=' + idNumber, [projectName, storeName, columnString]);
                        const result = await this.database.any(`UPDATE ${projectName}.${storeName} SET ${columnString} WHERE id=` + idNumber);
                        this.logger.info(result);
                        this.logger.info('updated record ' + projectName + '.' + storeName + ': id=' + idNumber);
                    }
                        res.status(202).json(id).end();
                }
            } catch (e) {
                this.logger.error(e);
                res.status(500).end();
            }
        });
    }

    start () {
        return this.webserver.listen(this.config.WebServer.PORT, () => {
            this.logger.info(`Spreaderix listening at http://localhost:${this.config.WebServer.PORT}`);
        });
    }
}
