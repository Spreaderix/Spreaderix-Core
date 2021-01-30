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

        this.webserver.get('/simple/projects', async (req, res) => {
            res.status(200).json(await (
                await this.database.any('SELECT schema_name FROM information_schema.schemata where schema_name not in (\'information_schema\',\'public\',\'pg_catalog\',\'pg_toast\');')
            ).map(x => x.schema_name)).end();
        });

        this.webserver.post('/simple/projects', async (req, res) => {
            const projectName = req.body.name;
            this.database.none('CREATE SCHEMA ' + projectName);
            logger.info('created project ' + projectName);
            res.status(201).end();
        });

        this.webserver.delete('/simple/projects/:projectname', async (req, res) => {
            const projectName = req.params.projectname;
            this.database.none('DROP SCHEMA ' + projectName);
            logger.info('deleted project ' + projectName);
            res.status(202).end();
        });
    }

    start () {
        return this.webserver.listen(this.config.WebServer.PORT, () => {
            this.logger.info(`Spreaderix listening at http://localhost:${this.config.WebServer.PORT}`);
        });
    }
}
