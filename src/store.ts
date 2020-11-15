import { parsePath } from './parsePath';
import { merge } from './utils';

export type Store = {
	get: (path?: string) => any;
	put: (diff: { [key: string]: any }) => { [key: string]: any };
};

export function createStore(): Store {
	const store = {};
	function get(path: string = '') {
		let current = store;
		for (let key of parsePath(path)) {
			if (current[key] === undefined || current[key] === null) {
				return null;
			}
			current = current[key];
		}
		return current;
	}
	function put(diff: { [key: string]: any }): { [key: string]: any } {
		return merge(diff, store);
	}
	return {
		get,
		put,
	};
}
