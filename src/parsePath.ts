export function parsePath(path: string): string[] {
	let trimmed = path;
	if (trimmed[0] === '/') trimmed = trimmed.substring(1);
	if (trimmed[trimmed.length - 1] === '/')
		trimmed = trimmed.substring(0, trimmed.length - 1);
	return trimmed ? trimmed.split('/') : [];
}
