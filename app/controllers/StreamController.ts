import * as express from 'express';
import * as request from 'request';
import { Track } from '../entity/Track';
import { getUrlRoute } from './CommonFunctions';

export class StreamController {

	public static async PlayFile (req: express.Request, res: express.Response) {
		const url = req.params.file;
		console.log(url);
		try {
			const track = await Track.findOne({ where: { stream_url: `${getUrlRoute()}/stream/${url}` }});
			track.plays = track.plays + 1 || 1;
			await track.save();
			return request.get(track.storageLocation).pipe(res);
		} catch (error) {
			console.error(error);
			return res.status(404).send({ error: 'File not found' });
		}
	}

}
