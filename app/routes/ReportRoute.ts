import * as express from 'express';
import { ReportController } from '../controllers/ReportController';

export const ReportRoute: express.Router = express.Router()
	.get('/reports', ReportController.All)
	.post('/report', ReportController.ReportEntity);
