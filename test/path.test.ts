import { isWildcardPath, parsePath, trimWildcard } from '../src/path';

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
});

test('trims wildcard from path', () => {
	expect(trimWildcard('')).toEqual('');
	expect(trimWildcard('a/b/c/*')).toEqual('a/b/c');
	expect(trimWildcard('*')).toEqual('');
	expect(trimWildcard('/*')).toEqual('');
	// expects '/*' to be present:
	expect(trimWildcard('asc*')).toEqual('as');
});
