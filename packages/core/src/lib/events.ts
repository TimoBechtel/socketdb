import { DATA_CONTEXT, SOCKET_EVENTS } from './constants';
import { WildcardPath } from './path';
import { BatchedUpdate } from './updateBatcher';

export type DataEvents = {
	[updatePath in `${typeof DATA_CONTEXT}:${string}`]: { data: BatchedUpdate };
} & {
	[updatePath in `${typeof DATA_CONTEXT}:${WildcardPath}`]: {
		data: { added?: string[]; deleted?: string[] };
	};
} & {
	[SOCKET_EVENTS.data.clientUpdate]: { data: BatchedUpdate };
	[SOCKET_EVENTS.data.requestSubscription]: {
		path: string;
		once?: boolean;
	};
	[SOCKET_EVENTS.data.requestUnsubscription]: { path: string };
	[SOCKET_EVENTS.data.requestKeysSubscription]: {
		path: string;
	};
};

export type KeepAliveEvents = {
	[SOCKET_EVENTS.keepAlive.ping]: Record<string, unknown>;
	[SOCKET_EVENTS.keepAlive.pong]: Record<string, unknown>;
};
