import * as express from 'express';
import { UserController } from '../controllers/UserController';
import * as UserMiddleware from '../middlewares/UserMiddleware';

export const CollectionRoute: express.Router = express.Router()

	.get('/collection/tracks', [UserMiddleware.CheckUpdate], UserController.GetSavedTracks)
	.put('/collection/tracks/:trackID', [UserMiddleware.CheckUpdate], UserController.SaveTrackToUser)
	.delete('/collection/tracks/:trackID', [UserMiddleware.CheckUpdate], UserController.RemoveTrackFromUser);
