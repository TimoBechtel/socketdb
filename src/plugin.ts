export type Plugin<T> = {
	name: string;
	events: T;
};
