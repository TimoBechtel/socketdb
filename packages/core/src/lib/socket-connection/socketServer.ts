import { Socket } from './socket';

type SessionContext = Record<string, unknown>;

export interface SocketServer {
	onConnection: (
		callback: (
			client: Socket,
			id: string,
			sessionContext?: SessionContext
		) => void
		// TODO: require to return an Unsubscribe function on the next major version
	) => void;
	listen: (port: number, callback?: () => void) => void;
}
