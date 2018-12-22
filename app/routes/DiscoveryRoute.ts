import * as express from 'express';
import { TrackController } from '../controllers/TrackController';

export const DiscoveryRoute: express.Router = express.Router()
	/**
	 * TODO;
	 * Make this return relevant things, like popular (unable to do with out any users)
	 * Make a new route that returns popular for genres
	 * Filter by `key, genre, bpm` first, add more later if need be.
	 */
	.get('/discover', TrackController.DiscoveryRoute);
