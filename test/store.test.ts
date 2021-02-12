import { Node, nodeify } from '../src/node';
import { createStore } from '../src/store';

test('returns null, if key does not exist', () => {
	const store = createStore();
	expect(store.get('some/value/that/doesnt/exist')).toEqual(nodeify(null));
});

test('returns null, if parent key is no object', () => {
	const store = createStore();
	store.put({
		value: { some: { value: { myvalue: { value: 'a' } } } },
	});
	expect(store.get('some/value/that/doesnt/exist')).toEqual(nodeify(null));
	store.put({
		value: { some: { value: { that: { value: '' } } } },
	});
	expect(store.get('some/value/that/doesnt/exist')).toEqual(nodeify(null));
	store.put({
		value: {
			some: {
				value: {
					myvalue: { value: { that: { value: { doesnt: { value: null } } } } },
				},
			},
		},
	});
	expect(store.get('some/value/that/doesnt/exist')).toEqual(nodeify(null));
});

test('returns requested values', () => {
	const store = createStore();
	store.put({
		value: {
			players: {
				value: {
					a: {
						value: {
							name: {
								value: 'Patrick',
							},
							position: {
								value: {
									x: {
										value: 0,
									},
									y: { value: 1 },
								},
							},
						},
					},
				},
			},
		},
	});

	expect(store.get('players/a/position/x')).toEqual({ value: 0 });
});

test('successfully merges data', () => {
	const store = createStore();
	store.put({
		value: {
			players: {
				value: {
					a: {
						value: {
							name: {
								value: 'Patrick',
							},
							position: {
								value: {
									x: { value: 0 },
									y: { value: 1 },
								},
							},
						},
					},
				},
			},
		},
	});

	store.put({
		value: {
			players: {
				value: {
					a: {
						value: {
							position: {
								value: {
									x: { value: 1 },
								},
							},
						},
					},
				},
			},
		},
	});

	expect(store.get()).toEqual({
		value: {
			players: {
				value: {
					a: {
						value: {
							name: {
								value: 'Patrick',
							},
							position: {
								value: {
									x: {
										value: 1,
									},
									y: {
										value: 1,
									},
								},
							},
						},
					},
				},
			},
		},
	});
});

test('successfully merges empty data', () => {
	const store = createStore();

	store.put({
		value: {
			players: {
				value: {
					a: {
						value: {
							name: {
								value: 'Patrick',
							},
							position: {
								value: {
									x: { value: 0 },
									y: { value: 1 },
								},
							},
						},
					},
				},
			},
		},
	});

	store.put({ value: {} });

	expect(store.get()).toEqual({
		value: {
			players: {
				value: {
					a: {
						value: {
							name: {
								value: 'Patrick',
							},
							position: {
								value: {
									x: {
										value: 0,
									},
									y: {
										value: 1,
									},
								},
							},
						},
					},
				},
			},
		},
	});
});

test('returns a diff containing all changed values', () => {
	const store = createStore();

	store.put({
		value: {
			players: {
				value: {
					a: {
						value: {
							name: {
								value: 'Patrick',
							},
							position: {
								value: {
									x: { value: 0 },
									y: { value: 1 },
								},
							},
						},
					},
					b: {
						value: {
							name: {
								value: 'Someone',
							},
							position: {
								value: {
									x: { value: 2 },
									y: { value: 4 },
								},
							},
						},
					},
				},
			},
		},
	});

	const diff = store.put({
		value: {
			players: {
				value: {
					a: {
						value: {
							name: {
								value: 'John',
							},
							position: {
								value: {
									x: { value: 0 },
									y: { value: 1 },
								},
							},
						},
					},
					c: {
						value: {
							name: {
								value: 'Peter Parker',
							},
						},
					},
				},
			},
		},
	});

	expect(diff).toEqual({
		value: {
			players: {
				value: {
					a: {
						value: {
							name: {
								value: 'John',
							},
						},
					},
					c: {
						value: {
							name: {
								value: 'Peter Parker',
							},
						},
					},
				},
			},
		},
	});
});

test('should recognize changes when passed as reference', () => {
	const store = createStore();

	const data: Node = {
		value: {
			a: {
				value: {
					b: {
						value: 'c',
					},
				},
			},
			d: {
				value: 0,
			},
		},
	};
	store.put(data);

	(data.value as any).a.value.b.value = 'e';

	const diff = store.put(data);

	expect(diff).toEqual({
		value: {
			a: {
				value: {
					b: {
						value: 'e',
					},
				},
			},
		},
	});
});