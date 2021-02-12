import { nodeify } from '../src/node';
import { createUpdateBatcher } from '../src/updateBatcher';

test('batches update', (done) => {
	const queue = createUpdateBatcher((update) => {
		expect(update.change).toEqual(nodeify({ a: { b: { d: 2, c: { e: 4 } } } }));
		expect(update.delete).toEqual(['a/b/c']);
		done();
	}, 100);
	queue({ type: 'change', data: nodeify({ a: { b: { c: 1 } } }) });
	queue({ type: 'delete', path: 'a/b/c' });
	queue({ type: 'change', data: nodeify({ a: { b: { d: 2 } } }) });
	queue({ type: 'change', data: nodeify({ a: { b: { c: { e: 4 } } } }) });
});

test('does not send changes, if path was deleted', (done) => {
	const queue = createUpdateBatcher((update) => {
		expect(update.change).toEqual(undefined);
		expect(update.delete).toEqual(['player']);
		done();
	}, 100);
	queue({ type: 'change', data: nodeify({ player: { a: { name: 'b' } } }) });
	queue({ type: 'delete', path: 'player' });
});
