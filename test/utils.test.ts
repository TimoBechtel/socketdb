import { isObject, joinPath } from '../src/utils';

test('detects arrays', () => {
	expect(isObject([1, 2, 3])).toBe(false);
});

test('detects nullish value', () => {
	expect(isObject(null)).toBe(false);
	expect(isObject(undefined)).toBe(false);
});

test('returns true on any other object', () => {
	expect(isObject({})).toBe(true);
});

test('joins paths', () => {
	expect(joinPath('', 'sub')).toBe('sub');
	expect(joinPath('a', 'b')).toBe('a/b');
});
