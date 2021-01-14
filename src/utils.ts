export function isObject(value: any) {
	return typeof value === 'object' && !!value && !Array.isArray(value);
}

export function joinPath(path: string, subpath: string): string {
	return `${path ? path + '/' : ''}${subpath}`;
}

/**
 * merges source to target and returns only changes
 */
export function mergeDiff(
	source: { [key: string]: any },
	target: { [key: string]: any }
): { [key: string]: any } {
	let diff = {};
	for (const [key, value] of Object.entries(source)) {
		if (isObject(value)) {
			if (!isObject(target[key])) target[key] = {};
			const subdiff = mergeDiff(value, target[key]);
			if (Object.keys(subdiff).length > 0) diff[key] = subdiff;
		} else {
			if (target[key] !== value) {
				target[key] = value;
				diff[key] = value;
			}
		}
	}
	return diff;
}
