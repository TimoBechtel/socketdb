import { deepClone } from './utils';

export type Hook<Arguments = void, Context = void> = (
	args: Arguments,
	cxt: Context
) => void | Arguments | Promise<void | Arguments>;

type Hooks = {
	[key: string]: Hook<any, any>;
};

type ExtractArguments<H extends Hook<any, any>> = H extends Hook<infer Arg, any>
	? Arg
	: never;
type ExtractContext<H extends Hook<any, any>> = H extends Hook<any, infer Cxt>
	? Cxt
	: never;

export function createHooks<T extends Hooks>() {
	let hooks: { [K in keyof T]?: T[K][] } = {};
	type K = keyof T;

	async function call(name: K): Promise<void>;
	async function call<Key extends K>(
		name: Key,
		passedArgs: ExtractContext<T[Key]> extends void
			? {
					args: ExtractArguments<T[Key]>;
			  }
			: {
					args: ExtractArguments<T[Key]>;
					context: ExtractContext<T[Key]>;
			  },
		config?: { asRef?: boolean }
	): Promise<ExtractArguments<T[Key]>>;

	/**
	 * calls hook
	 * this function will clone passed arguments by default
	 * as this might be an intensive task, this can be disabled by setting "asRef" to true
	 */
	async function call<Key extends K>(
		name: Key,
		{
			args = undefined,
			context = undefined,
		}: {
			args?: ExtractArguments<T[Key]>;
			context?: ExtractContext<T[Key]>;
		} = {},
		{ asRef = false } = {}
	): Promise<void | ExtractArguments<T[Key]>> {
		let result = args;
		if (hooks[name]) {
			if (!asRef && args) result = deepClone(args);
			for (const hook of hooks[name]) {
				const res = await hook(result, context);
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
