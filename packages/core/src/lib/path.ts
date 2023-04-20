import { Brand } from './utils';

export type WildcardPath = `${string}/*` | `*`;

/**
 * Parses a path into an array of path segments
 */
export function parsePath(path: string) {
	const trimmed = normalizePath(path);
	return trimmed ? (trimmed.split('/') as NormalizedPath[]) : [];
}

/**
 * This path has been normalized by removing leading and trailing slashes
 */
export type NormalizedPath<T extends string = string> = Brand<
	T,
	'NormalizedPath'
>;
/**
 * Normalizes a path by removing leading and trailing slashes
 */
export function normalizePath<Path extends string>(path: Path) {
	let trimmed: string = path;
	// using this approach instead of regex for performance
	if (trimmed[0] === '/') trimmed = trimmed.substring(1);
	if (trimmed[trimmed.length - 1] === '/')
		trimmed = trimmed.substring(0, trimmed.length - 1);
	return trimmed as NormalizedPath<Path>;
}

type JoinPathReturnType<
	PathA extends string,
	PathB extends string
> = PathA extends ''
	? NormalizedPath<PathB>
	: PathB extends ''
	? NormalizedPath<PathA>
	: NormalizedPath<`${PathA}/${PathB}`>;

/**
 * Joins two paths together. It always returns a normalized path with no leading or trailing slashes.
 * So joinPath('a', '/') will return 'a'
 */
export function joinPath<PathA extends string, PathB extends string>(
	path: PathA,
	subpath: PathB
): JoinPathReturnType<PathA, PathB> {
	const normalizedPath = normalizePath(path);
	const normalizedSubpath = normalizePath(subpath);
	if (normalizedPath === '')
		return normalizedSubpath as JoinPathReturnType<PathA, PathB>;
	if (normalizedSubpath === '')
		return normalizedPath as JoinPathReturnType<PathA, PathB>;
	return `${normalizedPath}/${normalizedSubpath}` as JoinPathReturnType<
		PathA,
		PathB
	>;
}

export function isWildcardPath(path: string): path is WildcardPath {
	return path === '*' || path.slice(-2) === '/*';
}

export function trimWildcard(path: string): string {
	return isWildcardPath(path) ? path.slice(0, -2) : path;
}

export function isChildPath<Parent extends string>(
	path: string,
	parentPath: Parent
): path is `${Parent}/${string}` {
	const normalizedParentPath = normalizePath(parentPath);
	if (normalizedParentPath === '') return true;
	return normalizePath(path).startsWith(`${normalizedParentPath}/`);
}
