export type SocketClient = {
	on(event: string, callback: (data: any) => void);
	off: (event: string, callback?: (data: any) => void) => void;
	send: (event: string, data: any) => void;
};
