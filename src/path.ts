export function parsePath(path: string): string[] {
	let trimmed = path;
	if (trimmed[0] === '/') trimmed = trimmed.substring(1);
	if (trimmed[trimmed.length - 1] === '/')
		trimmed = trimmed.substring(0, trimmed.length - 1);
	return trimmed ? trimmed.split('/') : [];
}

export function joinPath(path: string, subpath: string): string {
	return `${path ? path + '/' : ''}${subpath}`;
}

export function isWildcardPath(path: string): boolean {
	return path[path.length - 1] === '*';
}

export function trimWildcard(path: string): string {
	return isWildcardPath(path) ? path.slice(0, -2) : path;
}

export function isChildPath(path: string, parentPath: string): boolean {
	return path.startsWith(joinPath(parentPath, ''));
}
