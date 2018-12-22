export interface TrackMetadata {
	no: number;
	of: number;
}

export interface PictureMetadata {
	format: string;
	data: Buffer;
}

export interface MusicMetadata {
	title: string;
	artist: string[];
	albumartist: string[];
	album: string;
	year: string;
	track: TrackMetadata;
	genre: string[];
	disk: TrackMetadata;
	picture: PictureMetadata[];
	duration: number;
}
