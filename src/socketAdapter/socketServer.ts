import { Socket } from './socket';

export type SocketServer = {
	onConnection: (callback: (client: Socket, id: string) => void) => void;
};
