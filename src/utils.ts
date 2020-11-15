export function isObject(value: any) {
	return typeof value === 'object' && !!value && !Array.isArray(value);
}

export function joinPath(path: string, subpath: string): string {
	return `${path ? path + '/' : ''}${subpath}`;
}

export function traverseData(
	data: any,
	callback: (path: string, data: any) => void,
	path: string = ''
) {
	Object.entries(data).forEach(([key, value]) => {
		const currentPath = joinPath(path, key);
		callback(currentPath, value);
		if (isObject(value)) {
			traverseData(value, callback, currentPath);
		}
	});
}

export function merge(
	source: { [key: string]: any },
	target: { [key: string]: any }
): { [key: string]: any } {
	let diff = {};
	for (const [key, value] of Object.entries(source)) {
		if (isObject(value)) {
			if (!isObject(target[key])) target[key] = {};
			const subdiff = merge(value, target[key]);
			if (Object.keys(subdiff).length > 0) diff[key] = subdiff;
		} else {
			if (!equals(target[key], value)) {
				target[key] = value;
				diff[key] = value;
			}
		}
	}
	return diff;
}

function equals(value: any, newValue: any) {
	return value === newValue;
}
