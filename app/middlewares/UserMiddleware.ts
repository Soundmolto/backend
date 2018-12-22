import * as express from 'express';
import { User } from '../entity/User';
import { JWTService } from '../services/JWTService';

async function email_doesnt_exist (email) {
	const returnedEmail = await User.find_by_email(email);
	return returnedEmail == null;
}

export async function CheckCreate(req: express.Request, res: express.Response, next: express.NextFunction) {
	const emailPresent = null != req.body.email && '' !== req.body.email.trim();
	const passwordPresent = null != req.body.password && '' !== req.body.password.trim();
	const emailNotRegistered = await email_doesnt_exist(req.body.email);
	let error = '';
	const statusCode = 422;
	const canPass = emailPresent && passwordPresent && emailNotRegistered;
	let failed = false;

	if (emailPresent === false) {
		error = 'Email is required to register.';
		failed = true;
	}

	if (passwordPresent === false && failed === false) {
		error = 'Password is required to login.';
		failed = true;
	}

	if (emailNotRegistered === false && failed === false) {
		error = 'Email already registered.';
	}

	if (canPass) {
		next();
	} else {
		res.status(statusCode).send({ error });
	}
}

async function CheckAuthenticated (req: express.Request, res: express.Response, next: express.NextFunction) {
	let failed = false;
	let statusCode = 404;
	let returnObj: object = { error: 'Error occurred.' };
	const idNotPresent = null == req.params.id && typeof parseInt(req.params.id, 2) !== 'number';
	let defaultAction: any = () => res.status(statusCode).send(returnObj);
	const verifiedToken: { id: string; } = { id: null };

	try {
		const token = await JWTService.extractToken(req);
		const t = await JWTService.verifyToken((token as string));;
		if (typeof t === 'string') {
			verifiedToken.id = t;
		} else {
			verifiedToken.id = (t as { id: string }).id;
		}
	} catch (error) {
		failed = true;
		console.error(error);
	} finally {
		if (!failed && idNotPresent === true) {
			statusCode = 422;
			returnObj = { error: 'User ID is required.' };
		}

		if (!failed && idNotPresent !== true) {
			defaultAction = () => {
				if ('OPTIONS' === req.method) {
					res.status(200).send({});
				} else {
					next();
				}
			};
		}

		if (failed === true) {
			statusCode = 403;
			returnObj = { error: 'Missing authorization token.' };
		}

		return defaultAction();
	}

}

export async function AuthenticateWebSockets (token: string): Promise<boolean> {
	let authenticated = false;

	try {
		await JWTService.verifyToken(token);
		authenticated = true;
	} catch (error) {
		console.error(error);
	} finally {
		return authenticated;
	}

}

export async function CheckUpdate(req: express.Request, res: express.Response, next: express.NextFunction) {
	return CheckAuthenticated (req, res, next);
}

export async function CheckDelete(req: express.Request, res: express.Response, next: express.NextFunction) {
	return CheckAuthenticated (req, res, next);
}

export function CheckLogin (req: express.Request, res: express.Response, next: express.NextFunction) {
	const emailPresent = null != req.body.email && '' !== req.body.email.trim();
	const passwordPresent = null != req.body.password && '' !== req.body.password.trim();
	let error = '';
	const statusCode = 422;
	const canPass = emailPresent && passwordPresent;
	let failed = false;

	if (emailPresent === false) {
		error = 'Email is required to login.';
		failed = true;
	}

	if (passwordPresent === false && failed === false) {
		error = 'Password is required to login.';
		failed = true;
	}

	if (canPass) {
		next();
	} else {
		res.status(statusCode).send({ error });
	}
}

export function CheckFind (req: express.Request, res: express.Response, next: express.NextFunction) {
	if (req.params.vanityURL != null) {
		return next();
	} else {
		res.status(422).send({ error: 'User\'s url is required' });
	}
}
