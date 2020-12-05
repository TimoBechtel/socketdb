export type Socket = {
	onDisconnect: (callback: () => void) => void;
	on: (event: string, callback: (data: any) => void) => void;
	off: (event: string, callback?: (data: any) => void) => void;
	send: (event: string, data: any) => void;
};
