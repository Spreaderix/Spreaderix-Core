// @ts-check

// eslint-disable-next-line no-unused-vars
import Pgp from 'pg-promise';

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

        this.registerProjects();
        this.registerTables();
        this.registerDataManipulation();
    }

    registerProjects () {
        this.webserver.get('/simple/projects', async (req, res) => {
            try {
                res.status(200).json(await (
                    await this.database.any('SELECT schema_name FROM information_schema.schemata where schema_name not in (\'information_schema\',\'public\',\'pg_catalog\',\'pg_toast\');')
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
                await this.database.none('DELETE FROM $1:name.$2:name where id = $3:value', [projectName, storeName, idNumber]);
                this.logger.info('deleted record ' + projectName + '.' + storeName);
                res.status(202).end();
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
                let columnString = '';
                if (Array.isArray(columns)) {
                    columns.forEach((value, index, array) => {
                        if (value && value.column && value.value) {
                            if (columnString != ''){
                                columnString = columnString + `, ${value.column} = '${value.value}'`;
                            }else {
                                columnString = columnString + ` ${value.column} = '${value.value}'`;
                            }
                        }
                    });
                }
                let id;
                if (Object.keys(columns).length > 0) {
                    // id = await this.database.one('UPDATE $1:name.$2:name SET $3:name WHERE id=' + idNumber, [projectName, storeName, columnString]);
                    this.database.one(`UPDATE ${projectName}.${storeName} SET ${columnString} WHERE id=` + idNumber);
                } 
                this.logger.info('updated record ' + projectName + '.' + storeName + ': id=' + idNumber);
                res.status(201).json(id).end(); 
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
