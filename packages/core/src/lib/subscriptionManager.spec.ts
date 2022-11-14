/* eslint-disable @typescript-eslint/no-empty-function */
import { Node, nodeify } from './node';
import { createStore } from './store';
import { createSubscriptionManager } from './subscriptionManager';

test('subscribes to highest path', () => {
	const subscribedPaths: string[] = [];
	const manager = createSubscriptionManager({
		createPathSubscription(path) {
			subscribedPaths.push(path);
		},
		destroySubscription() {},
		restoreSubscription() {},
	});

	manager.subscribe('/foo', () => {});
	manager.subscribe('/foo/bar', () => {});

	expect(subscribedPaths).toEqual(['/foo']);
});

test('unsubscribes from path', () => {
	let subscribedPaths: string[] = [];
	const manager = createSubscriptionManager({
		createPathSubscription(path) {
			subscribedPaths.push(path);
		},
		destroySubscription(path) {
			subscribedPaths = subscribedPaths.filter((p) => p !== path);
		},
		restoreSubscription() {},
	});

	const unsubscribe = manager.subscribe('/foo', () => {});
	expect(subscribedPaths).toEqual(['/foo']);

	unsubscribe();
	expect(subscribedPaths).toEqual([]);
});

test('unsubscribes from path - alternative function', () => {
	let subscribedPaths: string[] = [];
	const manager = createSubscriptionManager({
		createPathSubscription(path) {
			subscribedPaths.push(path);
		},
		destroySubscription(path) {
			subscribedPaths = subscribedPaths.filter((p) => p !== path);
		},
		restoreSubscription() {},
	});

	const fun = () => {};
	manager.subscribe('/foo', fun);

	expect(subscribedPaths).toEqual(['/foo']);

	manager.unsubscribe('/foo', fun);
	expect(subscribedPaths).toEqual([]);
});

test('subscribes next higher path', () => {
	let subscribedPaths: string[] = [];
	const manager = createSubscriptionManager({
		createPathSubscription(path) {
			subscribedPaths.push(path);
		},
		destroySubscription(path) {
			subscribedPaths = subscribedPaths.filter((p) => p !== path);
		},
		restoreSubscription() {},
	});

	const unsubscribe = manager.subscribe('/foo', () => {});
	manager.subscribe('/foo/bar', () => {});
	expect(subscribedPaths).toEqual(['/foo']);

	unsubscribe();
	expect(subscribedPaths).toEqual(['/foo/bar']);
});

test('resubscribes', () => {
	const restoredPaths: string[] = [];
	const manager = createSubscriptionManager({
		createPathSubscription() {},
		destroySubscription() {},
		restoreSubscription(path) {
			restoredPaths.push(path);
		},
	});

	manager.subscribe('/foo', () => {});
	manager.subscribe('/bar', () => {});
	manager.subscribe('/foo/bar', () => {});
	manager.resubscribe();

	expect(restoredPaths).toEqual(['/foo', '/bar']);
});

test('notifies subscriber', (done) => {
	const manager = createSubscriptionManager<string>({
		createPathSubscription(path) {},
		destroySubscription() {},
		restoreSubscription() {},
	});

	manager.subscribe('/foo', (data) => {
		expect(data).toBe('bar');
		done();
	});

	manager.notify('/foo', 'bar');
});

test('recursively notifies subscriber of child paths', (done) => {
	const manager = createSubscriptionManager<string>({
		createPathSubscription(path) {},
		destroySubscription() {},
		restoreSubscription() {},
	});

	manager.subscribe('/foo/bar', (data) => {
		expect(data).toBe('baz');
		done();
	});

	manager.notify('/foo', 'baz', {
		recursiveDown: true,
	});
});

test('recursively notifies subscriber of parent paths', (done) => {
	const manager = createSubscriptionManager<string>({
		createPathSubscription(path) {},
		destroySubscription() {},
		restoreSubscription() {},
	});

	manager.subscribe('/foo', (data) => {
		expect(data).toBe('baz');
		done();
	});

	manager.notify('/foo/bar', 'baz', {
		recursiveUp: true,
	});
});

test('ignores self, if set', (done) => {
	const manager = createSubscriptionManager<string>({
		createPathSubscription(path) {},
		destroySubscription() {},
		restoreSubscription() {},
	});

	manager.subscribe('/foo/bar', () => {
		fail('should not be called');
	});

	manager.subscribe('/foo', (data) => {
		expect(data).toBe('baz');
		done();
	});

	manager.notify('/foo/bar', 'baz', {
		recursiveUp: true,
		excludeSelf: true,
	});
});

test('get data using the passed function and notify subscribers with that data', (done) => {
	const testData = {
		a: {
			b: {
				c: 'foo',
			},
		},
	};
	const store = createStore();
	store.put(nodeify(testData));

	const manager = createSubscriptionManager<Node>({
		createPathSubscription() {},
		destroySubscription() {},
		restoreSubscription() {},
	});

	manager.subscribe('/a', (data) => {
		expect(data).toEqual(nodeify(testData.a));
	});
	manager.subscribe('/a/b', (data) => {
		expect(data).toEqual(nodeify(testData.a.b));
	});
	manager.subscribe('/a/b/c', (data) => {
		expect(data).toEqual(nodeify(testData.a.b.c));
		done();
	});

	manager.notify('/a', (path) => store.get(path), {
		recursiveDown: true,
	});
});

test('get data from cache on if it is already subscribed', (done) => {
	// assumes that when a path is already subscribed, it will have up-to-date data available
	const manager = createSubscriptionManager({
		createPathSubscription(path) {},
		destroySubscription() {},
		restoreSubscription() {},
	});

	manager.subscribe('/foo', () => {});

	manager.subscribe(
		'/foo/bar',
		(data) => {
			expect(data).toBe('baz');
			done();
		},
		() => 'baz'
	);
});
