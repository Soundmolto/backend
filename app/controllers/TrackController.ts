import * as express from 'express';
import * as request from 'request';

import { getManager } from 'typeorm';

import { User } from '../entity/User';
import { UserRole } from '../enums/UserRole';
import { Track } from './../entity/Track';
import { getUrlRoute, guid } from './CommonFunctions';
import { convert_to_mp3, parse_form } from './ConversionController';
import { StorageController } from './StorageController';
import { convert, convert_png } from './TrackArtworkController';
import { UserController } from './UserController';

interface StubbedTrack {
	id: string;
	downloadable: string;
	name: string;
	url: string;
	artwork: string;
	visibility: string;
	secret_key: string;
	stream_url: string;
	plays: number;
	createdAt: number;
	waveform_location: string;
	genres: string[];
	hash: string;
	description: string;
	path: string;
}

interface DiscoveryReturnObject {
	tracks: Track[];
	nextUrl: string;
	hasMore: boolean;
}

interface FailedResponse {
	error: string;
}

const MAX_FILE_SIZE: number = 5000000000;

export class TrackController {

	public static UserCanMutateTrack (user: User, requestID: string) {
		return user.id === requestID;
	}

	/**
	 * Create a new Track and from an uploaded & converted track.
	 *
	 * @param {Object} track - The track object given from conversion.
	 * @param {User} user - The user we're putting the track on.
	 */
	public static async CreateTrackObject (track: StubbedTrack, user: User) {
		const newTrack = new Track();
		const { file_name, sharedFile, waveform_location, metadata, hash, calculate_duration } = await convert_to_mp3(track);
		const path = file_name.split('/uploads/')[1];
		const id = guid();
		let title = track.name;
		let duration = 0;
		let artwork = '';
		let genres = [];

		if (metadata != null) {
			if (metadata.title.trim() !== '') {
				title = metadata.title;
			}
			duration = metadata.duration;
			if (metadata.picture != null && metadata.picture.length >= 1) {
				const picture = metadata.picture[0];
				let converted = '';
				try {
					converted = (await convert_png(picture.data, hash) as string);
				} catch (error) {
					console.error(error);
				} finally {
					artwork = converted || '';
				}
			}

			genres = metadata.genre || [];
		}

		if (duration === 0) {
			duration = await calculate_duration(`${file_name}.mp3`);
		}

		let url = encodeURIComponent(title.split(' ').join('-')).toLocaleLowerCase();
		const tracksWithSameUrl = await Track.find({ where: { url }});

		if (tracksWithSameUrl.length !== 0) {
			for (const t of tracksWithSameUrl) {
				if (t.owner === user.id) {
					url = `${url}-${user.tracks.filter((tr: Track) => tr.url.indexOf(url) !== -1).length}`;
				}
			}
		}

		newTrack.downloadable = 'false';
		newTrack.name = title;
		newTrack.id = id;
		newTrack.url = url;
		newTrack.artwork = artwork;
		newTrack.visibility = 'private';
		newTrack.secret_key = guid();
		newTrack.stream_url = `${getUrlRoute()}/stream/${path}.mp3`;
		newTrack.plays = 0;
		newTrack.owner = user.id;
		newTrack.duration = duration;
		newTrack.createdAt = new Date().getTime();
		newTrack.waveform_location = waveform_location;
		newTrack.waveform_url = `${getUrlRoute()}/waveforms/${hash}`;
		newTrack.amountOfLikes = 0;
		newTrack.canDeleteFile = `${sharedFile}`;
		newTrack.genres = genres;
		newTrack.hash = hash;
		newTrack.description = '';

		return newTrack;
	}

	/**
	 * When the user POSTs to `/tracks` we'll upload the tracks & convert them to 128kbs mp3 files.
	 *
	 * @param {express.Request} req - The request.
	 * @param {express.Response} res - The response.
	 */
	public static async CreateTrack (req: express.Request, res: express.Response) {
		let response: FailedResponse | { user: User; created: Track[] } = { error: '404 - Page not found' };
		let status: number = 404;

		try {
			const id = await UserController.get_user_id(req);
			const user = await User.findOne({ where: { id } });
			const form = await parse_form(req, { maxFileSize: MAX_FILE_SIZE });
			const files = (form as any).files;
			const created = [];

			for (const field in files) {
				if (files[field] != null) {
					const file = files[field];
					const track = await TrackController.CreateTrackObject(file, user);

					const uploadedTrack = await StorageController.uploadTrack(track.hash, track.artwork);
					track.waveform_location = uploadedTrack.waveform;
					track.storageLocation = uploadedTrack.track;
					if (uploadedTrack.artwork != null) {
						track.artwork = uploadedTrack.artwork;
					}
					user.tracks.push(track);
					created.push(track.id);
				}
			}

			await user.save();
			response = { user, created };
			status = 200;
		} catch (err) {
			status = 500;
			response = { error: 'Oh snap, something happened with the file upload.' };
			console.error(err);
		} finally {
			return res.status(status).send(response);
		}
	}

	public static async DiscoveryLoggedOut (): Promise<Track[]> {
		const Tracks = await Track.find();

		for (const track of Tracks) {
			const user = await User.findOne({ where: { id: track.owner }});
			(track as any).user = user.profile;
		}

		return Tracks.sort((first, second) => second.createdAt - first.createdAt);
	}

	public static async DiscoveryRoute (req: express.Request, res: express.Response) {
		const self: string = await UserController.get_user_id(req);
		const status: number = 200;
		const returnValue: DiscoveryReturnObject = { tracks: [], nextUrl: '', hasMore: true };

		try {
			const amount: number = parseInt(req.query.offset || '0', 2);
			const amountToSkip: number = Math.ceil(amount / 10) * 10;
			const nextAmount = amountToSkip + 10;
			let allTracks = [];
			returnValue.nextUrl = `${getUrlRoute()}/discover?offset=${nextAmount}`;

			if (self != null) {
				const user = await User.findOne({ where: { id: self }});
				await user.following;
				let tracks = [].concat(user.tracks || []);

				for (const track of tracks) {
					track.user = user.profile;
					track.inCollection = false;
					const collection = await user.collection;
					for (const collectedTrack of collection) {
						if (collectedTrack.id === track.id) {
							track.inCollection = true;
						}
					}
				}
				for (const following of user.following) {
					const selfFollowing = await User.findOne({ where: { profile: { id: following.id }}});

					if (selfFollowing.tracks.length !== 0) {
						for (const track of selfFollowing.tracks) {
							(track as any).user = selfFollowing.profile;
							(track as any).inCollection = false;
							const collection = await user.collection;
							for (const collectedTrack of collection) {
								if (collectedTrack.id === track.id) {
									(track as any).inCollection = true;
								}
							}
						}
						tracks = tracks.concat(selfFollowing.tracks);
					}
				}

				allTracks = tracks.sort((first, second) => parseInt(second.createdAt, 2) - parseInt(first.createdAt, 2));
				allTracks = allTracks.filter((track: Track) => {
					let filterVal = track.visibility === 'public';
					if (self != null && track.user.id === user.profile.id) {
						filterVal = true;
					}

					return filterVal;
				});
			} else {
				allTracks = await TrackController.DiscoveryLoggedOut();
				allTracks = allTracks.filter((track: Track) => track.visibility === 'public');
			}

			returnValue.tracks = allTracks.slice(amountToSkip, nextAmount);
			returnValue.hasMore = Math.ceil(allTracks.length / 10) * 10 > Math.ceil(nextAmount / 10) * 10;
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(status).send(returnValue);
		}
	}

	public static async GetAll (req: express.Request, res: express.Response) {
		let ret: FailedResponse | Track[] = { error: 'Not found' };
		let status: number = 404;
		try {
			const self = await UserController.get_user_id(req);
			const user = await User.findOne({ where: { id: self }, select: ['role'] });
			if (user.role === UserRole.ADMIN) {
				const Tracks = await Track.find();
				for (const track of Tracks) {
					const trackOwner = await User.findOne({ where: { id: track.owner } });
					(track as any).user = trackOwner.profile;
				}
				console.log(Tracks);
				ret = Tracks;
				status = 200;
			}
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(status).send(ret);
		}
	}

	/**
	 * When the user GET's a given track, we'll return the requested track from the DB.
	 *
	 * @param {express.Request} req - The request.
	 * @param {express.Response} res - The response.
	 */
	public static async GetTrack (req: express.Request, res: express.Response) {
		let resStatus = 404;
		let resObject: FailedResponse | Track = { error: 'Track not found' };
		const id = req.params.trackID;

		try {
			const track = await Track.findOne({ where: { id } });
			await track.user;
			const selfId = await UserController.get_user_id(req);
			const trackSecret = await TrackController.GetTrackSecretKey(id);
			let ableToView = false;

			if (selfId != null) {
				(track as any).inCollection = false;
				const self = await User.findOne({ where: { id: selfId } });
				const collection = await self.collection;
				for (const t of collection) {
					if (t.id === track.id) {
						(track as any).inCollection = true;
					}
				}

				if (self.profile.id === track.user.id || (req.query.secret && req.query.secret === trackSecret)) {
					ableToView = true;
					track.secret_key = trackSecret;
				}
			}

			if (ableToView) {
				resObject = track;
				resStatus = 200;
			}

		} catch (error) {
			console.error(error);
		} finally {
			return res.status(resStatus).send(resObject);
		}
	}

	public static async GetPeaks (req: express.Request, res: express.Response) {
		const id = req.params.waveformID;

		try {
			const track = await Track.findOne({
				select: ['waveform_location'],
				where: {
					waveform_url: `${getUrlRoute()}/waveforms/${id}`,
				},
			});
			return request.get(track.waveform_location).pipe(res);
		} catch (error) {
			console.error(error);
			return res.status(404).send({ error: 'Waveform data not found' });
		}
	}

	/**
	 * Check whether the field passed in is mutable or not.
	 *
	 * @param {string} field - The field the user requested to mutate.
	 */
	public static get_track_mutable_field (field: string) {
		return {
			artwork: true,
			description: true,
			genres: true,
			name: true,
			url: true,
			visibility: true,
		}[field] === true;
	}

	/**
	 * When the user does a PATCH request to a track, check whether the fields can be mutated and if so, mutate away!
	 *
	 * @param {express.Request} req - The request.
	 * @param {express.Response} res - The response.
	 */
	public static async UpdateTrack (req: express.Request, res: express.Response) {
		let status = 404;
		let response: FailedResponse | User = { error: 'Unknown error occured' };
		const id = req.params.trackID;

		try {
			const track = await Track.findOne({ where: { id } });
			const owner = await User.findOne({ where: { id: track.owner } });
			const self = await UserController.get_user_id(req);

			if (TrackController.UserCanMutateTrack(owner, self) === false) {
				status = 403;
				response = { error: 'You are not authorized to alter this track!' };
			} else {
				for (const key in req.body) {
					if (true === TrackController.get_track_mutable_field(key)) {
						let value = req.body[key];

						if (key === 'genres') {
							if (value.split) {
								value = value.split(',');

								for (const genre in (value as string[])) {
									if (value[genre]) {
										value[genre] = value[genre].trim();
									}
								}

							}
						}

						track[key] = value;
					}
				}

				await track.save();
				const user = await User.findOne({ where: { id: track.owner } });
				await user.save();
				status = 200;
				response = user;
			}

		} catch (error) {
			console.error(error);
			status = 500;
			response = { error: 'Oops, something went wrong!' };
		} finally {
			return res.status(status).send(response);
		}
	}

	public static async NotifyUserOfLike (track: Track) {
		// TODO - all of it.
		// Utilize the existing WebSockets server.
	}

	public static ToggleLike (user: User, track: Track) {
		const toggle = (entity, likeEntity) => {
			let likes = [];
			let removed = true;
			if (entity.likes.length !== 0) {
				for (const like of entity.likes) {
					if (like.id === entity.id) {
						likes = entity.likes.filter((likedTrack: Track) => likedTrack.id !== likeEntity.id);
					}
				}
			} else {
				removed = false;
				likes.push(likeEntity);
			}
			return { likes, removed };
		};

		try {
			if (track != null) {
				if (user.likes == null) {
					user.likes = [];
				}

				if (track.amountOfLikes == null) {
					track.amountOfLikes = 0;
				}

				const toggled = toggle(user, track);
				user.likes = toggled.likes;
				if (toggled.removed) {
					track.amountOfLikes = track.amountOfLikes - 1;
					// Sanity check
					if (track.amountOfLikes < 0) {
						track.amountOfLikes = 0;
					}
				} else {
					track.amountOfLikes = track.amountOfLikes + 1;
				}
			}
		} catch (error) {
			console.error(error);
			throw new Error(error);
		} finally {
			return { user, track };
		}
	}

	/**
	 * When the user does a PATCH request to a track, check whether the fields can be mutated and if so, mutate away!
	 *
	 * @param {express.Request} req - The request.
	 * @param {express.Response} res - The response.
	 */
	public static async LikeTrack (req: express.Request, res: express.Response) {
		let status = 404;
		let response: FailedResponse | User = { error: 'Unknown error occured' };
		const id = req.params.trackID;

		try {
			const selfID = await UserController.get_user_id(req);
			const { user, track } = await TrackController.ToggleLike(
				await User.findOne({ where: { id: selfID} }),
				await Track.findOne({ where: { id } } ),
			);

			await user.save();
			await track.save();

			status = 200;
			response = await User.findOne({ where: { id: user.id } });
		} catch (error) {
			console.error(error);
			status = 500;
			response = { error: 'Oops, something went wrong!' };
		} finally {
			return res.status(status).send(response);
		}
	}

	/**
	 * When the user does a DELETE request to a track, ensure they're allowed to and then delete it.
	 *
	 * @param {express.Request} req - The request.
	 * @param {express.Response} res - The response.
	 */
	public static async DeleteTrack (req: express.Request, res: express.Response) {
		let status = 404;
		let response: FailedResponse | User = { error: 'Unknown error occured' };
		const id = req.params.trackID;

		try {
			const track = await Track.findOne({ where: { id } });
			const userId = track.owner.split(').join(');
			const user = await User.findOne({ where: { id: track.owner } });

			if (TrackController.UserCanMutateTrack(user, await UserController.get_user_id(req)) === false) {
				status = 403;
				response = { error: 'You are not authorized to alter this track!' };
			} else {
				const users = await User.find();
				const remove = async () => {
					const split = track.stream_url.split(/.mp3$/gm)[0].split('/stream/');
					const hash = split[split.length - 1];
					StorageController.removeTrack(hash).catch(console.error);
				};

				/**
				 * TODO;
				 * Convert to single transaction. (Users.save(users) ??)
				 */
				for (const singleUser of users) {
					let updated = false;
					const collection = await singleUser.collection;
					if (singleUser.likes.length !== 0) {
						singleUser.likes = singleUser.likes.filter((tr: Track) => track.id !== tr.id);
						updated = true;
					}

					if (collection.length !== 0) {
						singleUser.collection = collection.filter((tr: Track) => track.id !== tr.id);
						updated = true;
					}

					if (updated) {
						await singleUser.save();
					}
				}

				await track.remove();
				if (track.canDeleteFile === 'true') {
					remove();
				} else {
					const tracksWithSameHash = await Track.find({ where: { stream_url: track.stream_url }});
					// Safeguard incase this shit forgot to update
					if (tracksWithSameHash.length === 0) {
						remove();
					}

					if (tracksWithSameHash.length === 1) {
						const trackWithHash = tracksWithSameHash[0];
						trackWithHash.canDeleteFile = 'true';
						await trackWithHash.save();
					}
				}
				status = 200;
				response = await User.findOne({ where: { id: userId } });
			}

		} catch (error) {
			console.error(error);
			status = 500;
			response = { error: 'Oh no, something occurred. try again later' };
		} finally {
			return res.status(status).send(response);
		}
	}

	public static async GetUserSpecificTrack (req: express.Request, res: express.Response) {
		let resStatus = 404;
		let resObject: FailedResponse | { track: Track; user: User; } = { error: 'Track not found' };
		const url: string = req.params.trackURL;
		const userURL: string = req.params.userURL;
		const userProvidedSecret = req.query.secret;

		try {
			const tracks = await Track.find({ where: { url } });
			let retTrack = null;
			let retUser = null;
			const selfId = await UserController.get_user_id(req);
			let ableToView: boolean = false;
			let secret: string = '';

			for (const track of tracks) {
				const user = await User.findOne({ where: { id: track.owner } });
				if (user != null && userURL === user.profile.url) {
					retTrack = track;
					retTrack.user = user.profile;
					retUser = user;
					ableToView = track.visibility === 'public';
					const trackWithOnlySecret = await Track.findOne({
						select: ['secret_key'],
						where: { id: track.id },
					});
					secret = trackWithOnlySecret.secret_key;

					if (selfId != null) {
						(track as any).inCollection = false;
						const self = await User.findOne({ where: { id: selfId } });
						const collection = await self.collection;

						for (const trackInCollection of collection) {
							if (trackInCollection.id === track.id) {
								(track as any).inCollection = true;
							}
						}

						if (self.profile.id === retTrack.user.id) {
							ableToView = true;
						}
					}
				}
			}

			if (userProvidedSecret && userProvidedSecret === secret) {
				ableToView = true;
			}

			if (ableToView) {
				if (retTrack.owner !== selfId) {
					delete retTrack.secret_key;
				} else {
					retTrack.secret_key = secret;
				}
				resObject = { track: retTrack, user: retUser };
				resStatus = 200;
			}
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(resStatus).send(resObject);
		}
	}

	public static async UploadTrackArtwork (req: express.Request, res: express.Response) {
		let status = 404;
		let r: FailedResponse | Track = { error: 'Unable to upload track artwork' };
		const userId = await UserController.get_user_id(req);
		const trackID = req.params.id;

		try {
			const track = await Track.findOne({ where: { id: trackID } });
			const { hash } = await Track.findOne({ where: { id: trackID }, select: ['hash'] });

			if (userId !== track.owner) {
				status = 403;
				r.error = 'Unauthorized';
				throw new Error('Unauthorized');
			}

			const form = await parse_form(req, {});
			const files = (form as any).files;
			const file = files[Object.keys(files)[0]];
			if (track.artwork !== '') {
				await StorageController.removeArtwork(track.artwork);
			}
			const converted = await convert(file, hash);
			const { artwork } = await StorageController.uploadArtwork(converted.fileName);
			track.artwork = artwork;
			await getManager().save(track);
			r = track;
			status = 200;
		} catch (e) {
			console.error(e);
		} finally {
			res.status(status).send(r);
		}
	}

	public static async GetTrackSecretKey (id: string) {
		const trackWithKey = await Track.findOne({ where: { id }, select: ['secret_key'] });
		return trackWithKey.secret_key;
	}
}
