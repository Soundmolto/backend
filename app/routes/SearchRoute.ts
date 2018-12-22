import * as express from 'express';
import { SearchController } from '../controllers/SearchController';

export const SearchRoute: express.Router = express.Router()
	.post('/search', SearchController.SearchByText);
