import { type DATA_CONTEXT, type SOCKET_EVENTS } from './constants';
import { type WildcardPath } from './path';
import { type BatchedUpdate } from './updateBatcher';

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

/**
 * Can be overridden to add custom goodbye messages using module augmentation.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomGoodbyeMessage {}

/**
 * A socket event that is sent before the client is disconnected from the server.
 *
 * You can extend this by ov
 */
export type GoodbyeMessage =
	| {
			reason: 'keep-alive-check-failed' | 'unspecified';
	  }
	| CustomGoodbyeMessage;

export type ConnectionEvents = {
	[SOCKET_EVENTS.connection.goodbye]: GoodbyeMessage;
};
