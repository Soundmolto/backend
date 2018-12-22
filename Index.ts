import * as cluster from 'cluster';
import { cpus } from 'os';
import { env } from 'process';
import { config } from './config';
import { HTTPServer } from './config/Server';
import { WebsocketsServer } from './config/WebsocketsServer';

if (cluster.isMaster) {

	console.log(`\n -------------------> RUN ${env.NODE_ENV} ENVIRONMENT \n`);

	const numCPUs = cpus().length;

	for (const cpu of cpus()) {
		cluster.fork();
	}

	cluster.on('exit', (worker, code, signal) => {
		console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
		console.log('Starting a new worker');
		cluster.fork();
	});

} else {

	const port: number = Number(env.PORT) || config.PORT_APP || 3000;

	new HTTPServer().Start().then((server) => {

		server.listen(port);

		server.on('error', (error: any) => {
			if (error.syscall !== 'listen') {
				throw error;
			}

			const bind = typeof port === 'string'
			? 'Pipe ' + port
			: 'Port ' + port;

			switch (error.code) {
				case 'EACCES':
					console.error(bind + ' requires elevated privileges');
					process.exit(1);
					break;
				case 'EADDRINUSE':
					console.error(bind + ' is already in use');
					process.exit(1);
					break;
				default:
				throw error;
			}
		});

		server.on('listening', () => {

			const addr = server.address();
			const bind = typeof addr === 'string'
			? 'pipe ' + addr
			: 'port ' + addr.port;
			console.log('Server is running in process ' + process.pid + ' listening on PORT ' + addr.port + '\n');

		});

	});

	const wss = new WebsocketsServer();

}
