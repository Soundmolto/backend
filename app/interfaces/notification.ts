export interface Notification {
	title: string;
	message: string;
	originUser: string;
	dismissable?: boolean;
}
