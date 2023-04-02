import { Socket } from './socket';

type SessionContext = Record<string, unknown>;

export interface SocketServer {
	onConnection: (
		callback: (
			client: Socket,
			id: string,
			sessionContext?: SessionContext
		) => void
	) => void;
	listen: (port: number, callback?: () => void) => void;
}
