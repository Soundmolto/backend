import * as WebSocketClient from 'uws';
import { WebsocketsEnums } from '../app/enums/Websockets';
import * as UserMiddleware from '../app/middlewares/UserMiddleware';

type Callback = (ws: WebSocket) => void;

/**
 * Basic type hinting;
 */
interface ClientsObject {
	length: number;
	forEach: (callback: () => null) => {};
}

interface Servers extends Array<Server> {}

interface Server {
	on: (message: string, callback: Callback) => {};
	handleUpgrade: (request: object, socket: object, upgradeHead: void, callback: Callback) => {};
	broadcast: (message: string, options: object) => {};
	startAutoPing: (interval: number, userMessage: string) => {};
	close: (cb?: Callback) => {};
	clients: ClientsObject;
	serverGroup: Servers;
}

interface WebSocket {
	on: (type: string, callback: (value: any) => void) => {};
	send: (message: string) => {};
}

export class WebsocketsServer {
	private server: Server;

	constructor () {
		this.server = new WebSocketClient.Server({ port: 3000 });

		this.server.on('connection', (ws: WebSocket) => {
			ws.on('message', async (m) => {
				let message = m;

				try {
					const messageAsString = m.toString();
					// Yeah no idea why i have to double parse.
					message = JSON.parse(JSON.parse(messageAsString));
				} catch (e) {
					console.error(e);
				} finally {
					switch (message.type) {
						case 'authentication': {
							let authenticated: boolean = false;
							try {
								authenticated = await this.ensureAuthorization(message.token);
							} catch (error) {
								console.error(error);
							} finally {
								console.log(authenticated);
								if (authenticated) {
									ws.send(JSON.stringify({ Auth: 'success' }));
								} else {
									this.server.close();
								}

								break;
							}
						}
					}
				}
			});

			ws.send(this.beginAuthorization());
		});
	}

	private beginAuthorization (): string {
		const key = WebsocketsEnums.AUTHORIZATION_REQUIRED_KEY;
		const value = WebsocketsEnums.AUTHORIZATION_REQUIRED_VALUE;
		return JSON.stringify({ [key]: value });
	}

	private async ensureAuthorization (token: string): Promise<boolean> {
		let authenticated = false;
		try {
			authenticated = await UserMiddleware.AuthenticateWebSockets(token);
		} catch (e) {
			console.error(e);
		} finally {
			return authenticated;
		}
	}
}
