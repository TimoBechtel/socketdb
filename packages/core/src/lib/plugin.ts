export type Plugin<T> = {
	name: string;
	hooks: T;
};
