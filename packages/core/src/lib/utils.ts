export function isObject(value: any): value is Record<string, unknown> {
	return typeof value === 'object' && !!value && !Array.isArray(value);
}

/**
 * merges source to target and returns only changes
 *
 * Note: This function does not support circular references.
 */
type ObjectType = { [key: string]: ObjectType | any };
export function mergeDiff<Source extends ObjectType, Target extends ObjectType>(
	source: Source,
	target: Target
): Partial<Source> {
	const diff: ObjectType = {};
	for (const [key, value] of Object.entries(source)) {
		if (isObject(value)) {
			if (!isObject(target[key])) target[key as keyof Target] = {} as any;
			const subdiff = mergeDiff(value, target[key]);
			if (Object.keys(subdiff).length > 0) diff[key] = subdiff;
		} else {
			if (target[key] !== value) {
				target[key as keyof Target] = value;
				diff[key] = value;
			}
		}
	}
	return diff as Partial<Source>;
}

/**
 * Deeply clones arrays and objects.
 *
 * In most cases, you should use simpleDeepClone instead, which is about 3x faster.
 */
export function deepClone<T>(source: T): T {
	if (!source || typeof source !== 'object') return source;
	// In my tests, JSON.parse/JSON.stringify seems to be the fastest or equally fast to custom implementation
	return JSON.parse(JSON.stringify(source));
}

/**
 * This is about 3x faster than deepClone, but it only clones object structures:
 * It skips nullish values, arrays, primitives, functions, and dates, etc.
 *
 * Note: It does not support circular references.
 */
export function simpleDeepClone<T extends Record<string, unknown>>(
	source: T
): T {
	if (!source || !isObject(source)) return source;
	const clone: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(source)) {
		if (isObject(value)) clone[key] = simpleDeepClone(value);
		else clone[key] = value;
	}
	return clone as T;
}

export type Brand<T, B> = T & { __brand__: B };
