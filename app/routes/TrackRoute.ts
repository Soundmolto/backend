import * as express from 'express';
import { StreamController } from '../controllers/StreamController';
import { TrackController } from '../controllers/TrackController';
import * as UserMiddleware from '../middlewares/UserMiddleware';

export const TrackRoute: express.Router = express.Router()

	.post('/tracks/:id/track-artwork', [UserMiddleware.CheckUpdate], TrackController.UploadTrackArtwork)
	.get('/waveforms/:waveformID', TrackController.GetPeaks)
	.get('/stream/:file', StreamController.PlayFile)
	.get('/:userURL/:trackURL', TrackController.GetUserSpecificTrack)

	.get('/tracks', TrackController.GetAll)
	.get('/tracks/:trackID', TrackController.GetTrack)
	.post('/tracks', [UserMiddleware.CheckUpdate], TrackController.CreateTrack)
	.put('/tracks/:trackID/like', [UserMiddleware.CheckUpdate], TrackController.LikeTrack)
	.patch('/tracks/:trackID', [UserMiddleware.CheckUpdate], TrackController.UpdateTrack)
	.delete('/tracks/:trackID', [UserMiddleware.CheckUpdate], TrackController.DeleteTrack)
