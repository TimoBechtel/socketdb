import { Socket } from './socket';

export type SocketClient = {
	onConnect: (callback: () => void) => void;
} & Socket;
