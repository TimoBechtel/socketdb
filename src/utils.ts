export function isObject(value: any) {
	return typeof value === 'object' && !!value && !Array.isArray(value);
}

export function joinPath(path: string, subpath: string): string {
	return `${path ? path + '/' : ''}${subpath}`;
}

export function traverseData(
	data: { [key: string]: any },
	callback: (path: string, data: any) => void
) {
	let stack: { data: any; path: string }[] = [{ data, path: '' }];
	while (stack.length) {
		const current = stack.pop();
		for (let [key, value] of Object.entries(current.data)) {
			const path = joinPath(current.path, key);
			callback(path, value);
			if (isObject(value)) stack.push({ data: value, path });
		}
	}
}

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
