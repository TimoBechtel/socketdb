export type Hook<T> = (args: T) => void | T | Promise<void | T>;

type Hooks = {
	[key: string]: Hook<any>;
};

export function createHooks<T extends Hooks>() {
	let hooks: { [K in keyof T]?: T[K][] } = {};
	type K = keyof T;

	async function call(name: K): Promise<void>;
	async function call(name: K, callback: () => void): Promise<void>;
	async function call<A>(name: K, callback: Hook<A>, args: A): Promise<void>;

	async function call<A>(
		name: K,
		callback?: Hook<A> | (() => void),
		args?: A
	): Promise<void> {
		let result = args;
		if (hooks[name]) {
			for (const hook of hooks[name]) {
				const res = await hook(result);
				if (res) result = res;
			}
		}
		callback?.(result);
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
