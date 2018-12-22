import { Identity } from './identity';
import { Track } from './track';

export interface User {
	url: string;
	Identity: Identity;
	id: string;
	following: User[];
	tracks: Track[];
}
