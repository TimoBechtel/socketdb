import { joinPath } from './path';
import { isObject, simpleDeepClone } from './utils';

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
	expect(joinPath('a', '')).toBe('a');
	expect(joinPath('a', '/')).toBe('a');
	expect(joinPath('/', 'a')).toBe('a');
	expect(joinPath('/', '/')).toBe('');
	expect(joinPath('a', 'b')).toBe('a/b');
	expect(joinPath('/a', 'b/')).toBe('a/b');
});

test('clones objects', () => {
	const exampleData = {
		gate: -176552216,
		little: {
			tent: 'saddle',
			swim: 57016619.66467905,
			rhyme: {
				recursive: null as any,
				instead: {
					zoo: 1635080201,
					smile: [
						[
							-583862778.1331143,
							[
								{
									spend: {
										walk: [
											[
												526611866,
												{
													fireplace: 'joined',
													tide: 'pine',
													color: 'teach',
												},
												false,
											],
											false,
											true,
										],
										orbit: 'troops',
										prevent: 'copper',
									},
									curious: 'useful',
									temperature: false,
								},
								-2091067777,
								true,
							],
							'design',
						],
						'would',
						-805783402,
					],
					room: true,
				},
				excited: 1034077534.0131822,
				may: 'exist',
			},
		},
		throw: 'which',
	};

	const clone = simpleDeepClone(exampleData);
	expect(clone).toEqual(exampleData);
	expect(clone === exampleData).toBe(false);
	expect(clone.little === exampleData.little).toBe(false);
	expect(clone.little.rhyme.instead === exampleData.little.rhyme.instead).toBe(
		false
	);
	expect(clone.little.rhyme.instead).toEqual(exampleData.little.rhyme.instead);

	// skips arrays
	expect(
		clone.little.rhyme.instead.smile === exampleData.little.rhyme.instead.smile
	).toBe(true);
});
