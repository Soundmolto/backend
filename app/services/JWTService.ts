import * as JWT from 'jsonwebtoken';
import * as bearer from 'token-extractor';
import { config } from '../../config';

export class JWTService {

	public static signToken (params, options?: any): Promise<string> {
		return new Promise((resolve, reject) => {
			JWT.sign(params, config.SECRET, options || null, (err, token) => {
				if (err) {
					reject(err);
				}

				resolve(token);
			});
		});
	}

	public static verifyToken (token: string, options: object = {}): Promise<string|object> {
		return new Promise((resolve, reject) => {
			JWT.verify(token, config.SECRET, (err, decoded) => {
				if (err) {
					reject(err);
				}

				resolve(decoded);
			});
		});
	}

	public static extractToken (req) {
		return new Promise((resolve, reject) => {
			bearer(req, (err, token) => {
				if (err) {
					reject(err);
				}

				resolve(token);
			});
		});
	}

}
