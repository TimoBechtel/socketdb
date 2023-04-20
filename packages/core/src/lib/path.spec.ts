import { isChildPath, isWildcardPath, parsePath, trimWildcard } from './path';

test('parses path', () => {
	expect(parsePath('/players/1/position')).toEqual([
		'players',
		'1',
		'position',
	]);
	expect(parsePath('players/1/position')).toEqual(['players', '1', 'position']);
});

test('correctly parses empty path', () => {
	expect(parsePath('')).toEqual([]);
	expect(parsePath('/')).toEqual([]);
});

test('ignores leading and trailing slashes', () => {
	expect(parsePath('/root/path/')).toEqual(['root', 'path']);
});

test('checks if path is wildcard', () => {
	expect(isWildcardPath('*')).toBe(true);
	expect(isWildcardPath('')).toBe(false);
	expect(isWildcardPath('abc/adf/*')).toBe(true);
	expect(isWildcardPath('abc/adf/*/*')).toBe(true);
	expect(isWildcardPath('/*')).toBe(true);

	// invalid wildcard paths
	expect(isWildcardPath('abc/adf/')).toBe(false);
	expect(isWildcardPath('abc/adf*')).toBe(false);
});

test('trims wildcard from path', () => {
	expect(trimWildcard('')).toEqual('');
	expect(trimWildcard('a/b/c/*')).toEqual('a/b/c');
	expect(trimWildcard('*')).toEqual('');
	expect(trimWildcard('/*')).toEqual('');
	// ignores invalid wildcard paths
	expect(trimWildcard('asc*')).toEqual('asc*');
});

test('checks if path is a child of another path', () => {
	expect(isChildPath('a/b/c', 'a/b')).toBe(true);
	expect(isChildPath('a/*', 'a')).toBe(true);
	expect(isChildPath('a', '')).toBe(true);

	expect(isChildPath('a', 'a')).toBe(false);
	expect(isChildPath('a/b/cd', 'a/b/c')).toBe(false);
	expect(isChildPath('a', 'a/b')).toBe(false);
});
