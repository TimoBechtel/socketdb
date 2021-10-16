export function isObject(value: any): value is Record<string, unknown> {
	return typeof value === 'object' && !!value && !Array.isArray(value);
}

/**
 * merges source to target and returns only changes
 */
type ObjectType = { [key: string]: ObjectType | any };
export function mergeDiff<Source extends ObjectType, Target extends ObjectType>(
	source: Source,
	target: Target
): Partial<Source> {
	let diff: ObjectType = {};
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
 * deeply clones arrays and objects
 * @returns
 */
export function deepClone<T>(source: T): T {
	if (!source || typeof source !== 'object') return source;
	// In my tests, JSON.parse/JSON.stringify seems to be the fastest or equally fast to custom implementation
	return JSON.parse(JSON.stringify(source));
}
