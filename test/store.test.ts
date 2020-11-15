import { createStore } from '../src/store';

test('returns null, if key does not exist', () => {
	const store = createStore();
	expect(store.get('some/value/that/doesnt/exist')).toBe(null);
});

test('returns null, if parent key is no object', () => {
	const store = createStore();
	store.put({ some: { value: [] } });
	expect(store.get('some/value/that/doesnt/exist')).toBe(null);
	store.put({ some: { value: { that: '' } } });
	expect(store.get('some/value/that/doesnt/exist')).toBe(null);
	store.put({ some: { value: { that: { doesnt: null } } } });
	expect(store.get('some/value/that/doesnt/exist')).toBe(null);
});

test('returns requested values', () => {
	const store = createStore();
	store.put({
		players: {
			a: {
				name: 'Patrick',
				position: {
					x: 0,
					y: 1,
				},
			},
		},
	});

	expect(store.get('players/a/position/x')).toBe(0);
});

test('successfully merges data', () => {
	const store = createStore();
	store.put({
		players: {
			a: {
				name: 'Patrick',
				position: {
					x: 0,
					y: 1,
				},
			},
		},
	});

	store.put({
		players: {
			a: {
				position: {
					x: 1,
				},
			},
		},
	});

	expect(store.get()).toEqual({
		players: {
			a: {
				name: 'Patrick',
				position: {
					x: 1,
					y: 1,
				},
			},
		},
	});
});

test('successfully merges empty data', () => {
	const store = createStore();
	store.put({
		players: {
			a: {
				name: 'Patrick',
				position: {
					x: 0,
					y: 1,
				},
			},
		},
	});

	store.put({});

	expect(store.get()).toEqual({
		players: {
			a: {
				name: 'Patrick',
				position: {
					x: 0,
					y: 1,
				},
			},
		},
	});
});

test('returns a diff containing all changed values', () => {
	const store = createStore();
	store.put({
		players: {
			a: {
				name: 'Patrick',
				position: {
					x: 0,
					y: 1,
				},
			},
			b: {
				name: 'Someone',
				position: {
					x: 2,
					y: 4,
				},
			},
		},
	});

	const diff = store.put({
		players: {
			a: {
				name: 'John',
				position: {
					x: 0,
					y: 1,
				},
			},
			c: {
				name: 'Peter Parker',
			},
		},
	});

	expect(diff).toEqual({
		players: {
			a: {
				name: 'John',
			},
			c: {
				name: 'Peter Parker',
			},
		},
	});
});
