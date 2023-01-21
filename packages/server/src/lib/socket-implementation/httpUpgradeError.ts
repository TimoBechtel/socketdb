const ERROR_CODES = {
	BAD_REQUEST: {
		code: 400,
		message: 'Bad Request',
	},
	UNAUTHORIZED: {
		code: 401,
		message: 'Unauthorized',
	},
	FORBIDDEN: {
		code: 403,
		message: 'Forbidden',
	},
	NOT_FOUND: {
		code: 404,
		message: 'Not Found',
	},
	INTERNAL_SERVER_ERROR: {
		code: 500,
		message: 'Internal Server Error',
	},
};

type ErrorCode = keyof typeof ERROR_CODES;

export class WebsocketServerError extends Error {
	public readonly code;

	constructor(opts: { code: ErrorCode }) {
		const errorType =
			ERROR_CODES[opts.code] || ERROR_CODES.INTERNAL_SERVER_ERROR;
		super(errorType.message);
		this.code = opts.code;
		this.name = 'SocketDBServerError';
	}
}

export function createHttpResponse(code: ErrorCode) {
	const errorType = ERROR_CODES[code] || ERROR_CODES.INTERNAL_SERVER_ERROR;
	return `HTTP/1.1 ${errorType.code} ${errorType.message}\r\n\r\n`;
}
