export type RecursivePartial<T> = {
	[P in keyof T]?: T[P] extends []
		? T[P]
		: T[P] extends object
		? RecursivePartial<T[P]>
		: T[P];
};
