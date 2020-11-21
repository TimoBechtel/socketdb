import { parsePath } from '../src/parsePath';

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
