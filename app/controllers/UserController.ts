import { compareSync, genSalt, hash } from 'bcrypt';
import * as express from 'express';
import { getConnection, getManager } from 'typeorm';
import { config } from '../../config';

import { getUrlRoute, guid } from './CommonFunctions';
import { parse_form } from './ConversionController';
import { convert } from './ProfilePictureController';

import { JWTService } from '../services/JWTService';

import { Profile } from '../entity/Profile';
import { Track } from '../entity/Track';
import { User } from '../entity/User';
import { UserRole } from '../enums/UserRole';
import { StorageController } from './StorageController';
import { TrackController } from './TrackController';

interface PasswordHash {
	password: string|null;
	error: string|null;
	reason: any;
}

interface FailedResponse {
	error: string;
}

const canUpdate = {
	email: true,
	following: false,
	id: false,
	password: true,
	profile: true,
	tracks: false,
};

// I don't remember why i went with this approach but it works
const validateValue = {
	email: () => true,
	following: () => false,
	id: () => false,
	password: () => true,
	profile: (value: any) => {
		return true;
	},
	tracks: () => false,
};

export class UserController {

	public static async All (req: express.Request, res: express.Response) {
		let ret: FailedResponse | User[] = { error: 'Not found' };
		let status: number = 404;
		try {
			const self = await UserController.get_user_id(req);
			const user = await User.findOne({ where: { id: self }, select: ['role'] });
			// Probably very slow..
			if (user.role === UserRole.ADMIN) {
				const SampleList = await User.find();
				for (const possibleUser of SampleList) {
					await possibleUser.followers;
					await possibleUser.following;
				}
				ret = SampleList;
				status = 200;
			}
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(status).send(ret);
		}
	}

	public static async Find (req: express.Request, res: express.Response) {
		let statusCode: number = 404;
		let returnObj: FailedResponse|User = { error: 'User not found' };

		try {
			const vanityUrl: string = req.params.vanityURL;
			const user: User[] = await User.find_by_vanity_url(vanityUrl);
			const selfID: string = await UserController.get_user_id(req);
			const amount: number = parseInt(req.query.offset || '0', null);
			const amountToSkip: number = Math.ceil(amount / 10) * 10;
			const nextAmount = amountToSkip + 10;
			const nextUrl = `${getUrlRoute()}/users/${vanityUrl}?offset=${nextAmount}`;
			const selfUser = user[0];
			await selfUser.followers;
			await selfUser.following;

			let self: User|null = null;
			let allTracks = [];

			if (selfID != null) {
				self = await User.findOne({ where: { id: selfID }});
			}

			for (const following of selfUser.following) {
				const followingUser = await User.findOne({ where: { profile: { id: following.id }}});
				(following as any).amountOfFollowers = followingUser.followers.length;
			}

			for (const followers of selfUser.followers) {
				const follower = await User.findOne({ where: { profile: { id: followers.id }}});
				(followers as any).amountOfFollowers = follower.followers.length;
			}

			// Send only the profile for the user.
			for (const track of selfUser.tracks) {
				const trackOwner = await User.findOneById(track.owner);
				// Cast as any because i'm lazy
				(track as any).user = trackOwner.profile;
				(track as any).inCollection = false;

				if (self != null) {
					const collection = await self.collection;

					for (const trackInCollection of collection) {
						if (trackInCollection.id === track.id) {
							(track as any).inCollection = true;
						}
					}
				}

				if (selfUser.id === self.id) {
					track.secret_key = await TrackController.GetTrackSecretKey(track.id);
				}

				delete track.description; // Save some bytes.
			}

			statusCode = 200;
			returnObj = selfUser;
			allTracks = selfUser.tracks.sort((first, second) => second.createdAt - first.createdAt);
			allTracks = allTracks.filter((track: Track) => {
				let filterVal = track.visibility === 'public';
				if (self != null && self.id === user[0].id) {
					filterVal = true;
				}

				return filterVal;
			});

			(returnObj as User).tracks = allTracks.slice(amountToSkip, nextAmount);
			(returnObj as any).hasMore = Math.ceil(allTracks.length / 10) * 10 > Math.ceil(nextAmount / 10) * 10;
			(returnObj as any).nextUrl = nextUrl;
			(returnObj as any).amountOfTracks = allTracks.length;
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(statusCode).send(returnObj);
		}

	}

	public static async GetFollowing (req: express.Request, res: express.Response) {
		let statusCode: number = 404;
		let returnObj: FailedResponse | { following: Profile[] } = { error: 'User not found' };

		try {
			const vanityUrl: string = req.params.vanityURL;
			const user = await User.find_by_vanity_url(vanityUrl);
			const self = user[0];
			await self.following;
			statusCode = 200;
			returnObj = { following: self.following };
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(statusCode).send(returnObj);
		}
	}

	public static async get_user_id (req: express.Request): Promise<string|null> {
		const verified = { id: null };

		try {
			const token = await JWTService.extractToken(req);
			const t = await JWTService.verifyToken((token as string));
			if (typeof t === 'string') {
				verified.id = t;
			} else {
				verified.id = (t as { id: string }).id;
			}
		} catch (error) {
			console.error(error);
		} finally {
			return verified.id;
		}
	}

	public static async get_profile_id (req: express.Request) {
		const verified = { id: null };

		try {
			const token = await JWTService.extractToken(req);
			const t = await JWTService.verifyToken((token as string));
			if (typeof t === 'string') {
				verified.id = t;
			} else {
				verified.id = (t as { id: string }).id;
			}
		} catch (error) {
			console.error(error);
		} finally {
			const user = await User.findOne({ where: { id: verified.id } }) || { profile: { id: '' } };
			return user.profile.id;
		}
	}

	public static async Create (req: express.Request, res: express.Response) {
		let statusCode = 200;
		let returnObject: FailedResponse | { user: User; token: string; };

		try {
			const { email, password } = req.body;
			const hashed = await UserController.hash_password(password);
			const profile = new Profile();
			const user = new User();

			profile.bio = '';
			profile.description = '';
			profile.displayName = '';
			profile.firstName = '';
			profile.location = '';
			profile.profilePicture = '';
			const id = guid();
			profile.id = id;
			profile.url = id;
			await getManager().save(profile);

			user.email = email;
			user.password = hashed.password;
			user.profile = profile;
			user.following = [];
			user.followers = [];
			user.tracks = [];
			user.likes = [];
			user.url = profile.url;
			user.verified = 'false';
			user.role = UserRole.USER;
			user.createdAt = Date.now();
			user.collection = [];

			const Result = await User.save(user);
			delete Result.password;

			const token = await UserController.GenerateToken(email, password);

			returnObject = { token, user: Result };
		} catch (ex) {
			console.error(ex);
			statusCode = 500;
			returnObject = { error: 'Server error occurred, try again shortly.' };
		} finally {
			return res.status(statusCode).send(returnObject);
		}
	}

	public static async GenerateToken (email, password) {
		const constant = config.CONSTANT_INJECTION;
		const user = await User.find_by_email(email);
		const id = user.id;
		const token = await JWTService.signToken({ constant, email, id, password }, { expiresIn: '60 days' });
		return token;
	}

	public static async Login (req: express.Request, res: express.Response) {
		let statusCode = 422;
		let returnObject: FailedResponse | { user: User; token: string; } = {
			error: 'Email and/or password does not match records on file.',
		};
		try {
			const { email, password } = req.body;
			const self = await User.login(email, password);

			if (compareSync(password, self.password) === true && self.email === email) {
				const token = await UserController.GenerateToken(email, password);
				const user = await User.find_by_email(email);
				const role = self.role;

				if (role === UserRole.ADMIN || role === UserRole.MODERATOR) {
					user.role = role;
				}

				returnObject = { user, token };
				statusCode = 200;
			}
		} catch (ex) {
			console.error(ex);
			statusCode = 500;
			returnObject = { error: 'Server error occurred, try again shortly.' };
		} finally {
			return res.status(statusCode).send(returnObject);
		}
	}

	public static async UploadProfilePic (req: express.Request, res: express.Response) {
		let status = 404;
		let r: FailedResponse | User = { error: 'Unable to upload profile picture' };
		const userId = await UserController.get_user_id(req);
		const userID = req.params.id;

		try {
			if (userId !== userID) {
				throw new Error('Unauthorized');
			}

			const form = await parse_form(req, {});
			const files = (form as any).files;
			const file = files[Object.keys(files)[0]];
			const user = await User.findOneById(userID);
			const profile = await user.profile;
			if (user.profile.profilePicture !== '') {
				await StorageController.removeProfilePicture(user.profile.profilePicture);
			}
			const converted = await convert(file, profile.id);
			const { profilePicture } = await StorageController.uploadProfilePicture(converted.fileName);
			profile.profilePicture = profilePicture;
			await getManager().save(profile);
			r = user;
			status = 200;
		} catch (e) {
			console.error(e);
		} finally {
			//
			res.status(status).send(r);
		}
	}

	public static async Update (req: express.Request, res: express.Response) {
		let resStatus = 404;
		let resObject: FailedResponse | User = { error: 'User not found' };

		try {
			const userRequestedID = await UserController.get_user_id(req);
			const originUser = await User.findOne({ where: { id: userRequestedID }, select: ['role'] });
			const role = originUser.role;

			if (req.params.id === userRequestedID || role === UserRole.ADMIN) {
				const user = await User.findOneById(req.params.id);
				const profile = user.profile;
				const profileId = Object.assign({}, profile).id;

				if (user != null) {
					for (const key in req.body) {
						if ((user[key] != null || key === 'password') && canUpdate[key] && validateValue[key](req.body[key])) {
							if (key === 'profile') {
								for (const bodyKey in req.body[key]) {

									if (profile[bodyKey] != null) {
										const data = req.body[key][bodyKey] || '';
										if (data != null && data !== '' && bodyKey !== 'profilePicture') {
											profile[bodyKey] = data;
										}
									}
								}
							}

							if (key === 'password') {
								try {
									const hashed = await UserController.hash_password(req.body[key]);
									if (hashed.error == null) {
										user.password = hashed.password;
									}
									console.log(hashed);
								} catch (error) {
									console.error(error);
								}
							}
						}
					}
					user.url = profile.url || '';
				}

				profile.id = profileId;
				await getManager().save(profile);

				const Result = await User.save(user);

				if (null != Result) {
					resStatus = 200;
					delete user.url;
					resObject = user;
					if ((resObject as User).password) {
						delete (resObject as User).password;
					}
				}
			} else {
				resStatus = 403;
				resObject = { error: 'You are not authenticated to alter this user.' };
			}
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(resStatus).send(resObject);
		}
	}

	public static async Delete (req: express.Request, res: express.Response) {
		const id: string = req.params.id;
		const userRequestedID = await UserController.get_user_id(req);
		const originUser = await User.findOne({ where: { id: userRequestedID },  select: ['role'] });
		const role = originUser.role;
		const returnObj: { text: string; } = { text: 'ERROR' };
		let statusCode = 404;

		try {
			const user = await User.findOneById(id);
			const HAS_USER = user != null;

			if (HAS_USER && (user.id === userRequestedID || role === UserRole.ADMIN)) {
				const manager = getManager();

				for (const track of user.tracks) {
					await manager.remove(track);
				}
				await manager.remove(user);
				returnObj.text = 'Success';
				statusCode = 204;
			}
		} catch (ex) {
			console.error(ex);
		} finally {
			return res.status(statusCode).send(returnObj);
		}

	}

	public static async Follow (req: express.Request, res: express.Response) {
		let resStatus = 404;
		let resObject: FailedResponse | User = { error: 'User not found' };
		const authenticatedId = await UserController.get_user_id(req);

		try {
			if (req.params.id !== authenticatedId) {
				const userToFollow: User = await User.findOneById(req.params.id);
				const self: User = await User.findOneById(authenticatedId);
				let Result: User;
				const toFollowFollers = await userToFollow.followers;
				const selfFollowing = await self.following;
				const containsMe = toFollowFollers.filter((follower: Profile) => follower.id === self.profile.id).length !== 0;

				if (false === containsMe) {
					toFollowFollers.push(self.profile);
					selfFollowing.push(userToFollow.profile);
					userToFollow.followers = toFollowFollers;
					self.following = selfFollowing;
					await getManager().save(toFollowFollers);
					await getManager().save(selfFollowing);
					await getManager().save(userToFollow);
					await getManager().save(self);
					await self.followers;
					Result = userToFollow;
				} else {
					Result = userToFollow;
				}

				resStatus = 200;
				delete userToFollow.url;
				resObject = Result;
			} else {
				resStatus = 400;
				(resObject as FailedResponse).error = `You can't follow yourself.`;
			}
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(resStatus).send(resObject);
		}
	}

	public static async Unfollow (req: express.Request, res: express.Response) {
		let resStatus = 404;
		let resObject: FailedResponse | User = { error: 'User not found' };
		const authenticatedId = await UserController.get_user_id(req);

		try {
			if (req.params.id !== authenticatedId) {
				const userToFollow: User = await User.findOneById(req.params.id);
				const self: User = await User.findOneById(authenticatedId);
				let Result: User;
				let toFollowFollers = await userToFollow.followers;
				let selfFollowing = await self.following;
				const containsMe = toFollowFollers.filter((p: Profile) => p.id === self.profile.id).length !== 0;

				if (true === containsMe) {
					toFollowFollers = toFollowFollers.filter((p: Profile) => p.id !== self.profile.id);
					selfFollowing = selfFollowing.filter((p: Profile) => p.id !== userToFollow.profile.id);
					userToFollow.followers = toFollowFollers;
					self.following = selfFollowing;
					await getManager().save(toFollowFollers);
					await getManager().save(selfFollowing);
					await getManager().save(userToFollow);
					await getManager().save(self);
					await userToFollow.followers;
					Result = userToFollow;
				} else {
					Result = userToFollow;
				}

				resStatus = 200;
				delete userToFollow.url;
				resObject = Result;
			} else {
				resStatus = 400;
				(resObject as FailedResponse).error = `You can't follow yourself.`;
			}
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(resStatus).send(resObject);
		}
	}

	public static async SaveTrackToUser (req: express.Request, res: express.Response) {
		let resStatus: number = 404;
		let resObject: FailedResponse | Track[] = { error: 'User not found' };
		const id = await UserController.get_user_id(req);

		try {
			const connection = getConnection();
			const user = await connection.getRepository(User).findOne({ where: { id }});
			const track = await Track.findOne({ where: { id: req.params.trackID }});
			// Safety first kids!
			let collection = await user.collection || [];
			const filtered = collection.filter((t: Track) => track.id === t.id);

			if (filtered.length === 0) {
				collection = [track].concat(collection);
			}

			user.collection = collection || [];
			await user.save();
			resStatus = 200;

			for (const t of collection) {
				const u: User = await User.findOneById(t.owner);
				(t as any).user = u.profile;
			}

			resObject = collection;
		} catch (error) {
			console.error(error);
		} finally {
			res.status(resStatus).send(resObject);
		}
	}

	public static async RemoveTrackFromUser (req: express.Request, res: express.Response) {
		let resStatus: number = 404;
		let resObject: FailedResponse | Track[] = { error: 'User not found' };
		const id = await UserController.get_user_id(req);

		try {
			const connection = getConnection();
			const user = await connection.getRepository(User).findOne({ where: { id }});
			const track = await Track.findOne({ where: { id: req.params.trackID }});
			// Safety first kids!
			let collection = await user.collection || [];
			collection = collection.filter((t: Track) => track.id !== t.id);
			user.collection = collection || [];
			await user.save();
			resStatus = 200;

			for (const t of collection) {
				const u = await User.findOneById(t.owner);
				(t as any).user = u.profile;
			}

			resObject = collection;
		} catch (error) {
			console.error(error);
		} finally {
			res.status(resStatus).send(resObject);
		}
	}

	public static async GetSavedTracks (req: express.Request, res: express.Response) {
		let resStatus: number = 404;
		let resObject: FailedResponse | Track[] = { error: 'User not found' };
		const authID = await UserController.get_user_id(req);

		try {
			const user = await User.findOneById(authID);
			const collection = await user.collection;
			const UsersHash = {};

			for (const track of collection) {
				if (UsersHash[track.owner] == null) {
					const u: User = await User.findOneById(track.owner);
					(track as any).user = u.profile;
					UsersHash[track.owner] = u.profile;
				} else {
					track.user = UsersHash[track.owner];
				}
			}
			resStatus = 200;
			resObject = collection;
		} catch (error) {
			console.error(error);
		} finally {
			res.status(resStatus).send(resObject);
		}
	}

	private static async hash_password (password: string): Promise<PasswordHash> {
		const returnVal = { password: null, error: null, reason: null };
		try {
			const salt = await genSalt(10);
			const hashed = await hash(password, salt);
			returnVal.password = hashed;
		} catch (error) {
			returnVal.error = 'Hash failed';
			returnVal.reason = error;
		} finally {
			return returnVal;
		}
	}
}
