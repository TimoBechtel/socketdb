export const DATA_CONTEXT = 'data' as const;
export const KEEP_ALIVE_CONTEXT = 'keep-alive' as const;

export const SOCKET_EVENTS = {
	data: {
		clientUpdate: `${DATA_CONTEXT}:update`,
		requestSubscription: `${DATA_CONTEXT}:subscribe`,
		requestKeysSubscription: `${DATA_CONTEXT}:subscribeKeys`,
		requestUnsubscription: `${DATA_CONTEXT}:unsubscribe`,
	},
	keepAlive: {
		ping: `${KEEP_ALIVE_CONTEXT}:ping`,
		pong: `${KEEP_ALIVE_CONTEXT}:pong`,
	},
} as const;
