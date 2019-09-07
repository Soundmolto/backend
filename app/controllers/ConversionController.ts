import { createHash, Hash } from 'crypto';
import { IncomingForm } from 'formidable';
import { createReadStream, existsSync, ReadStream, renameSync, unlinkSync } from 'fs';
import * as musicMetadata from 'music-metadata';
import { Lame } from 'node-lame';
import { join, resolve } from 'path';
import { Files, FileToConvert } from '../interfaces/files';

import * as waveform from 'waveform';
import { IAudioMetadata } from "music-metadata";
const root = resolve(process.cwd(), '.');
export const uploadDirectory: string = join(resolve(root), '/uploads');
const waveformFile = (file: string) => resolve(uploadDirectory, file);

/**
 * Type hinting for Lame bitrate support.
 * Out here to allow further tweaks in the future without any major headaches.
 */
type bitrate = 8 | 16 | 24 | 32 | 40 | 48 | 56 | 64 | 80 | 96 | 112 | 128 | 144 | 160 | 192 | 224 | 256 | 320;
const bitrate: bitrate = 128;

function encoder_wrapper (output: string, filePath: string) {
	return new Promise((response, reject) => {
		new Lame({ output, bitrate })
			.setFile(filePath)
			.encode()
			.then(() => { response(true); })
			.catch((e: Error) => reject(e));
	});
}

function calculate_duration (file: string): Promise<number> {
	return musicMetadata.parseFile(file).then(metadata => {
		return metadata.format.duration;
	});
}

function create_waveform (audiofile: string, name: string) {
	return new Promise((res, rej) => {
		waveform(audiofile, {
			'waveformjs': name,
			'wjs-plain': false,
			'wjs-precision': 4,
			'wjs-width': 44100,
		}, (err: null|Error, buf: Buffer) => {
			if (err) {
				return rej(err);
			}

			return res(buf.toString('hex'));
		});
	});
}

function hash_file (file: string): Promise<string> {
	return new Promise((res, reject) => {
		try {
			const hash: Hash = createHash('sha256');
			const input: ReadStream = createReadStream(file);

			input.on('readable', () => {
				const data = input.read();

				if (data) {
					hash.update(data);
				} else {
					res(hash.digest('hex'));
				}
			});
		} catch (e) {
			console.error(e);
			reject(e);
		}
	});
}

export async function convert_to_mp3 (file: FileToConvert) {
	let fileName: string | null;
	let alreadyExists: boolean = false;
	let waveformLocation: string;
	let metadata: IAudioMetadata|null = null;
	let hash: string = '';

	try {
		const newPath: string = `${file.path.split('/uploads/')[0]}/uploads/.${file.name}`;
		hash = await hash_file(file.path);
		fileName = resolve(uploadDirectory, `${hash}`);
		waveformLocation = waveformFile(`waveform-${hash}`);
		const fileLocation: string = `${fileName}.mp3`;
		alreadyExists = existsSync(fileLocation) && existsSync(waveformLocation);
		renameSync(file.path, newPath);

		if (false === alreadyExists) {
			await encoder_wrapper(fileLocation, newPath);
			await create_waveform(fileLocation, waveformLocation);
		}

		metadata = await musicMetadata.parseFile(fileLocation, {duration: true});

		unlinkSync(newPath);

		return {
			file_name: fileName,
			hash,
			metadata,
			sharedFile: alreadyExists,
			waveform_location: waveformLocation,
		};

	} catch (error) {
		console.error(error);
	}
}

export function parse_form (req, opts = {}) {
	return new Promise((res, rej) => {
		const form = new IncomingForm(opts);
		form.uploadDir = uploadDirectory;

		form.on('error', (err) => {
			throw new Error(err);
		});

		form.parse(req, (err, fields, files: Files) => {
			if (err) {
				return rej(err);
			}

			res({ fields, files });
		});

	});
}
