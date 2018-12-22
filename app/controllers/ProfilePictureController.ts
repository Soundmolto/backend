import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import * as sharp from 'sharp';
import { getUrlRoute, guid } from './CommonFunctions';
import { uploadDirectory } from './ConversionController';

async function convert_png (file: any, id: string) {
	return new Promise((res: (value: string) => any, rej) => {
		const profilePicGuid = guid();
		const location = `${resolve(uploadDirectory, `profile-picture-${profilePicGuid}`)}.png`;

		sharp(file)
			.resize(200)
			.png()
			.toFile(location)
			.then(() => res(location))
			.catch((err: Error) => rej(err));
	});
}

// If the file doesn't exist, we'll just log an error, But we won't act on it.
export async function remove_picture (id) {
	const location = `${resolve(uploadDirectory, `profile-picture-${id}`)}`;

	try {
		unlinkSync(location);
	} catch (e) {
		console.error(e);
	} finally {
		return '';
	}
}

export async function convert (file: any, id: string) {
	let fileName = '';
	try {
		const png: string = await convert_png(file.path, id);
		fileName = png;
		unlinkSync(resolve(uploadDirectory, file.path));
	} catch (error) {
		console.error(error);
	} finally {
		return { fileName };
	}
}
