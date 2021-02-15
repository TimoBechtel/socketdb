import { deepClone } from './utils';

export type Hook<T> = (args: T) => void | T | Promise<void | T>;

type Hooks = {
	[key: string]: Hook<any>;
};

export function createHooks<T extends Hooks>() {
	let hooks: { [K in keyof T]?: T[K][] } = {};
	type K = keyof T;

	async function call(name: K): Promise<void>;
	async function call<A>(
		name: K,
		args: A,
		config?: { asRef?: boolean }
	): Promise<A>;

	/**
	 * calls hook
	 * this function will clone passed arguments by default
	 * as this might be an intensive task, this can be disabled by setting "asRef" to true
	 */
	async function call<A>(
		name: K,
		args?: A,
		{ asRef = false } = {}
	): Promise<void | A> {
		let result = args;
		if (hooks[name]) {
			if (!asRef && args) result = deepClone(args);
			for (const hook of hooks[name]) {
				const res = await hook(result);
				if (res) result = res;
			}
		}
		return result;
	}

	function register(name: K, hook: T[K]) {
		if (!hooks[name]) hooks[name] = [];
		hooks[name].push(hook);
	}

	return {
		call,
		register,
	};
}
