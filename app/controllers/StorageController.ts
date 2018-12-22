import { Bucket, Storage } from '@google-cloud/storage';
import { existsSync, unlinkSync } from 'fs';
import { uploadDirectory } from './ConversionController';

interface UploadedTrack {
	track: string;
	waveform: string;
	artwork?: string;
}

const bucketKeys = {
	artwork: 'soundmolto-storage-artwork',
	music: 'soundmolto-storage-music',
	profilePictures: 'soundmolto-storage-profile-picture',
};

const storage = new Storage({ projectId: 'soundmolto' });

const getPublicUploadObject = () => ({
	// Support for HTTP requests made with `Accept-Encoding: gzip`
	gzip: true,
	metadata: { cacheControl: 'public, max-age=31536000' },
	public: true,
});

export class StorageController {

	public static getTrackBucket = (): Promise<Bucket> => {
		return new Promise((res) => res(
			storage.bucket(bucketKeys.music),
		));
	}

	public static getArtworkBucket = (): Promise<Bucket> => {
		return new Promise((res) => res(storage.bucket(bucketKeys.artwork)));
	}

	public static getProfilePictureBucket = (): Promise<Bucket> => {
		return new Promise((res) => res(storage.bucket(bucketKeys.profilePictures)));
	}

	public static uploadTrack = (hash: string, artwork?: string): Promise<UploadedTrack> => {
		return new Promise(async (res, rej) => {
			const bucket = await StorageController.getTrackBucket();
			const artworkBucket = await StorageController.getArtworkBucket();
			const file = `${uploadDirectory}/${hash}.mp3`;
			let artworkExists = false;

			bucket.upload(file, getPublicUploadObject()).then(async ([u, response]) => {
				let waveform: string;

				try {
					await bucket.upload(`${uploadDirectory}/waveform-${hash}`, getPublicUploadObject());
					waveform = `https://storage.googleapis.com/${bucketKeys.music}/waveform-${hash}`;
					if (existsSync(artwork)) {
						artworkExists = true;
						await artworkBucket.upload(artwork, getPublicUploadObject());
					}
				} catch (error) {
					console.error(error);
				} finally {
					const track = `https://storage.googleapis.com/${bucketKeys.music}/${hash}.mp3`;
					const retObj: UploadedTrack = { track, waveform };
					if (artworkExists) {
						retObj.artwork = `https://storage.googleapis.com/${bucketKeys.artwork}/${artwork.split('/uploads/')[1]}`;
					}

					unlinkSync(`${uploadDirectory}/waveform-${hash}`);
					unlinkSync(`${uploadDirectory}/${hash}.mp3`);
					if (artworkExists) {
						unlinkSync(artwork);
					}

					res(retObj);
				}
			}).catch(rej);
		});
	}

	public static removeTrack = (hash: string): Promise<{ success: boolean; }> => {
		return new Promise(async (res, rej) => {
			const trackBucket = await StorageController.getTrackBucket();
			const artworkBucket = await StorageController.getArtworkBucket();
			try {
				await trackBucket.file(`${hash}.mp3`).delete();
				await trackBucket.file(`waveform-${hash}`).delete();
				await artworkBucket.file(`track-artwork-${hash}.png`).delete();
				res({ success: true });
			} catch (error) {
				console.error(error);
				rej(error);
			}
		});
	}

	public static removeArtwork = (file: string): Promise <{ success: boolean }> => {
		return new Promise(async (res, rej) => {
			const fileName = file.split(`${bucketKeys.artwork}/`)[1];
			const bucket = await StorageController.getArtworkBucket();
			try {
				await bucket.file(fileName).delete();
				res({ success: true });
			} catch (error) {
				console.error(error);
				rej(error);
			}
		});
	}

	public static uploadArtwork = (file: string): Promise<{ artwork: string; }> => {
		return new Promise(async (res, rej) => {
			const bucket = await StorageController.getArtworkBucket();

			bucket.upload(file, getPublicUploadObject()).then(async ([u, response]) => {
				unlinkSync(file);
				res({ artwork: `https://storage.googleapis.com/${bucketKeys.artwork}/${file.split('/uploads/')[1]}` });
			}).catch(rej);
		});
	}

	public static removeProfilePicture = (file: string): Promise <{ success: boolean }> => {
		return new Promise(async (res, rej) => {
			const fileName = file.split(`${bucketKeys.profilePictures}/`)[1];
			const bucket = await StorageController.getProfilePictureBucket();
			try {
				await bucket.file(fileName).delete();
				res({ success: true });
			} catch (error) {
				console.error(error);
				rej(error);
			}
		});
	}

	public static uploadProfilePicture = (file: string): Promise<{ profilePicture: string; }> => {
		return new Promise(async (res, rej) => {
			const bucket = await StorageController.getProfilePictureBucket();

			bucket.upload(file, getPublicUploadObject()).then(async ([u, response]) => {
				unlinkSync(file);
				const profilePicture = `https://storage.googleapis.com/${bucketKeys.profilePictures}/${file.split('/uploads/')[1]}`;
				res({ profilePicture });
			}).catch(rej);
		});
	}

}
