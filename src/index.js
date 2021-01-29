// @ts-check

import express from 'express';
import bodyParser from 'body-parser';

import { DiContainer } from 'bubble-di';

DiContainer.setContainer(new DiContainer());

DiContainer.getContainer().registerInstance('config', {
    PORT: 10001
});

DiContainer.getContainer().registerInstance('express', (() => {
    // registered as singleton (resolve retrieves this instance created here)
    const app = express();
    app.use(bodyParser.json());
    return app;
})());

console.log(`started in environment: ${DiContainer.getContainer().resolve('express').settings.env}`);

DiContainer.getContainer().resolve('express').listen(
    DiContainer.getContainer().resolve('config').PORT, () => {
        console.log(`Spreaderix listening at http://localhost:${DiContainer.getContainer().resolve('config').PORT}`);
    });
