import * as express from 'express';
import { Connection, getConnection } from 'typeorm';
import { Profile } from '../entity/Profile';
import { Track } from '../entity/Track';
import { User } from '../entity/User';
import { UserController } from './UserController';

interface FailedResponse {
	error: string;
}

export class SearchController {

	public static async SearchByText (req: express.Request, res: express.Response) {
		let resStatus = 404;
		let resObject: FailedResponse | { users: Profile[]; tracks: Track[]; } = { error: 'No results found' };
		const query: string = req.body.query;

		try {
			const connection: Connection = getConnection();
			const profileRepository = connection.getRepository(Profile);
			const trackRepository = connection.getRepository(Track);

			const users = await profileRepository.find({ where: `displayName LIKE "%${query}%" OR url LIKE "%${query}%"` });
			const tracks = await trackRepository.find({ where: `name LIKE "%${query}%"` });
			const originID = await UserController.get_profile_id(req);

			for (const profile of users) {
				const user = await User.findOne({ where: { url: profile.url } });
				(profile as any).followersAmount = user.followers.length;
				(profile as any).followingAmount = user.following.length;
				let followingYou = false;
				let youFollow = false;

				for (const following of user.following) {
					if (following.id === originID) {
						followingYou = true;
					}
				}
				for (const follower of user.followers) {
					if (follower.id === originID) {
						youFollow = true;
					}
				}
				(profile as any).followingYou = followingYou;
				(profile as any).youFollow = youFollow;
			}

			for (const track of tracks) {
				const user = await User.findOneById(track.owner);
				(track as any).user = user.profile;
			}

			resObject = { users, tracks };
			resStatus = 200;
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(resStatus).send(resObject);
		}
	}
}
