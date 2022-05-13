import { Socket } from './socket';

export type SessionContext = Record<string, unknown>;

export type SocketServer = {
	onConnection: (
		callback: (
			client: Socket,
			id: string,
			sessionContext?: SessionContext
		) => void
	) => void;
};
