import * as express from 'express';
import { Report } from '../entity/Report';
import { Track } from '../entity/Track';
import { User } from '../entity/User';
import { UserController } from './UserController';

interface FailedResponse {
	error: string;
}

interface SuccessResponse {
	message: string;
}

export class ReportController {

	public static async ReportEntity (req: express.Request, res: express.Response) {
		let resStatus = 404;
		let resObject: FailedResponse | SuccessResponse = { error: 'Unable to report this entity as it was not found.' };
		const userId = await UserController.get_user_id(req);

		try {
			if (userId == null) {
				resStatus = 401;
				resObject = { error: 'You are not authorized to report this entity.' };
				throw new Error('Unauthorized');
			}
			const report = new Report();
			const track: Track = await Track.findOne({ where: { id: req.body.id } });
			const user: User = await User.findOne({ where: { id: req.body.id } });
			let trackUser;

			if (track != null) {
				trackUser = await track.owner;
			}

			report.reporterId = userId;
			report.reportedTrackId = track && track.id || '';
			report.reportedUserId = user && user.id || trackUser || '';
			report.evidence = '';

			if (user != null) {
				report.entity = 'user';
			}

			if (track != null) {
				report.entity = 'track';
			}

			if (report.reportedTrackId === '' && report.reportedUserId === '') {
				throw new Error('Entity does not exist');
			}

			report.intermediaryId = '';
			await Report.save(report);
			resStatus = 200;
			const entity = track != null ? track.name : (user.profile.displayName || user.profile.url || user.profile.id);
			resObject = { message: `Successfully reported ${entity}` };
		} catch (error) {
			console.error(error);
		} finally {
			return res.status(resStatus).send(resObject);
		}
	}

	/**
	 * TODO: Finish this.
	 */
	public static async All (req: express.Request, res: express.Response) {
		let resStatus = 404;
		let resObj: FailedResponse | { reports: Report[] } = { error: 'Not found' };

		try {
			const reports = await Report.find();

			for (const report of reports) {
				(report as any).plaintiff = await User.findOne({ where: { id: report.reporterId } });
				(report as any).defendant = await User.findOne({ where: { id: report.reportedUserId } });
				if (report.entity === 'track') {
					(report as any).reportedEntity = await Track.findOne({ where: { id: report.reportedTrackId }});
				}

				if (report.entity === 'user') {
					(report as any).reportedEntity = await User.findOne({ where: { id: report.reportedUserId }});
				}

				(report as any).judge = await User.findOne({ where: { id: report.intermediaryId } });
			}

			resObj = { reports };
			resStatus = 200;

		} catch (error) {
			console.error(error);
		} finally {
			res.status(resStatus).send(resObj);
		}
	}

}
