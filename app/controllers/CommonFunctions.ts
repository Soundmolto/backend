import { env } from 'process';
import { config } from '../../config';

export function guid () {
	const s4 = (_ = null) => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

export function getHttpOrHttps (): string {
	return env.APP_SUBDOMAIN_ENABLED ? 'https' : 'http';
}

export function getUrlRoute (): string {
	return `${getHttpOrHttps()}://${config.API_ENDPOINT}${getHttpOrHttps() !== 'https' ? `:${config.PORT_APP}` : ''}`;
}
