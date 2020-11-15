export function parsePath(path: string): string[] {
	const trimmed = path.replace(/^\//, '');
	return trimmed ? trimmed.split('/') : [];
}
