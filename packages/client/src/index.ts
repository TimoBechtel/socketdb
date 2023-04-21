export { SocketDBClient } from './lib/client';
export type {
	ChainReference,
	ClientPlugin,
	SocketDBClientAPI,
} from './lib/client';
export { mockSocketClient } from './lib/socket-implementation/mockClient';
export { createWebsocketClient } from './lib/socket-implementation/websocketClient';
