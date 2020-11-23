import { SocketClient } from './socketClient';

export type SocketServer = {
	onConnection: (callback: (client: SocketClient, id: string) => void) => void;
};
