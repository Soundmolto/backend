import * as express from 'express';
import { CollectionRoute } from '../app/routes/CollectionRoute';
import { DiscoveryRoute } from '../app/routes/DiscoveryRoute';
import { ReportRoute } from '../app/routes/ReportRoute';
import { SearchRoute } from '../app/routes/SearchRoute';
import { TrackRoute } from '../app/routes/TrackRoute';
import { UserRoute } from '../app/routes/UserRoute';

interface IROUTER {
	path: string;
	middleware: any[];
	handler: express.Router;
}

export const ROUTER: IROUTER[] = [
	{
		handler: CollectionRoute,
		middleware: [],
		path: '/',
	},
	{
		handler: ReportRoute,
		middleware: [],
		path: '/',
	},
	{
		handler: UserRoute,
		middleware: [],
		path: '/',
	},
	{
		handler: TrackRoute,
		middleware: [],
		path: '/',
	},
	{
		handler: SearchRoute,
		middleware: [],
		path: '/',
	},
	{
		handler: DiscoveryRoute,
		middleware: [],
		path: '/',
	},
];
