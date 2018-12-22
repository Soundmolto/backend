import { resolve } from 'path';
import { createConnection } from 'typeorm';
import { config, DIALECT } from '../config';

export const Connection = createConnection({
	database: config.DATABASE.DB,
	entities: [
		resolve(__dirname, '../app/entity/**/*.ts'),
		resolve(__dirname, '../app/entity/**/*.js'),
	],
	host: config.DATABASE.SERVER,
	logging: false,
	password: config.DATABASE.PASSWORD,
	port: config.DATABASE.PORT_DB,
	synchronize: true,
	type: DIALECT,
	username: config.DATABASE.USER_DB,
});
