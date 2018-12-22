import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import { readFileSync } from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as methodOverride from 'method-override';
import * as morgan from 'morgan';
import { resolve } from 'path';
import { env } from 'process';

import * as subdomain from 'express-subdomain';
import { Connection } from './Database';
import { ROUTER } from './Router';

let key = '';
let cert = '';

if (env.APP_SUBDOMAIN_ENABLED === 'true') {
	key = readFileSync(resolve(process.cwd(), './certs/_wildcard.musicstreaming.dev-key.pem'), { encoding: 'UTF8' });
	cert = readFileSync(resolve(process.cwd(), './certs/_wildcard.musicstreaming.dev.pem'), { encoding: 'UTF8' });
}

export class HTTPServer {

	private app: express.Application;
	private server: http.Server|https.Server;

	constructor() {
		this.app = express();

		if (env.APP_SUBDOMAIN_ENABLED === 'true') {
			this.server = https.createServer({ key, cert }, this.app);
		} else {
			this.server = http.createServer(this.app);
		}
	}

	public Start(): Promise<http.Server|https.Server> {
		return this.ConnectDB().then(() => {
			this.ExpressConfiguration();
			this.ConfigurationRouter();
			return this.server;
		});
	}

	private ExpressConfiguration(): void {

		/** Subdomain for dev. */
		if (env.APP_SUBDOMAIN_ENABLED === 'true') {
			this.app.use(subdomain('api', (req, res, next) => next() ));
		}

		this.app.use((req, res, next) => {
			res.setTimeout(15 * 60000, () => res.send(408));
			next();
		});

		this.app.use(bodyParser.urlencoded({extended: true}));
		this.app.use(bodyParser.json({ limit: '50mb'} ));
		this.app.use(methodOverride());

		this.app.use((req, res, next): void => {
			res.header('Access-Control-Allow-Origin', '*');
			res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
			res.header('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE,OPTIONS');
			next();
		});

		this.app.use(morgan('combined'));
		this.app.use(cors());

		this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
			const error = new Error('Not found');
			err.status = 404;
			next(err);
		});

	}

	private ConfigurationRouter(): void {

		for (const route of ROUTER) {
			this.app.use(route.path, route.middleware, route.handler);
		}

		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction): void => {
			res.status(404);
			res.json({
				error: 'Not found',
			});
			next();
		});

		this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void  => {
			if (err.name === 'UnauthorizedError') {
				res.status(401).json({
					error: 'Please send a valid Token...',
				});
			}
			next();
		});

		this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
			res.status(err.status || 500);
			res.json({
				error: err.message,
			});
			next();
		});
	}

	private ConnectDB(): Promise<any> {
		return Connection;
	}

}
