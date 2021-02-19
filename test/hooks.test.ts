import { createHooks, Hook } from '../src/hooks';

test('allow registering middleware for a specific hook', (done) => {
	type Hooks = {
		'test:hook': Hook<void>;
	};
	const hooks = createHooks<Hooks>();

	hooks.register('test:hook', (data) => {
		expect(data).toEqual(undefined);
		done();
	});
	hooks.call('test:hook');
});

test('allow changing passed data', (done) => {
	type Hooks = {
		'test:hook': Hook<{ message: string }>;
	};
	const hooks = createHooks<Hooks>();

	// this hook should not change anything
	hooks.register('test:hook', ({ message }) => {
		expect(message).toEqual('hello world');
	});

	hooks.register('test:hook', ({ message }) => {
		expect(message).toEqual('hello world');
		return {
			message: `-- ${message} --`,
		};
	});

	hooks.register('test:hook', ({ message }) => {
		expect(message).toEqual('-- hello world --');
		return {
			message: `/// ${message} ///`,
		};
	});

	hooks
		.call('test:hook', { args: { message: 'hello world' } })
		.then(({ message }) => {
			expect(message).toEqual('/// -- hello world -- ///');
			done();
		});
});

test('arguments are cloned by default', (done) => {
	type Hooks = {
		'test:hook': Hook<{ data: { message: string } }>;
	};
	const hooks = createHooks<Hooks>();
	const exampleData = { data: { message: 'hello world' } };

	hooks.register('test:hook', ({ data }) => {
		expect(data.message).toEqual('hello world');
		expect(data).not.toBe(exampleData.data);
	});

	hooks.call('test:hook', { args: exampleData }).then(({ data }) => {
		done();
	});
});

test('allow cancelling hook with error message', (done) => {
	type Hooks = {
		'test:hook': Hook<{ message: string }>;
	};
	const hooks = createHooks<Hooks>();
	let hookTriggered = false;

	hooks.register('test:hook', ({ message }) => {
		expect(message).toEqual('hello world');
		throw new Error('hook failed');
	});
	hooks
		.call('test:hook', { args: { message: 'hello world' } })
		.then(() => {
			hookTriggered = true;
		})
		.catch(({ message }) => {
			expect(message).toEqual('hook failed');
		});

	setTimeout(() => {
		expect(hookTriggered).toBe(false);
		done();
	}, 10);
});

test('allow asynchronous functions as middleware', (done) => {
	type Hooks = {
		'test:hook': Hook<{ data: any }>;
	};
	const hooks = createHooks<Hooks>();

	hooks.register('test:hook', async (data) => {
		expect(data).toEqual(undefined);
		return {
			data: 'hello world',
		};
	});
	hooks.register('test:hook', (data) => {
		expect(data).toEqual({ data: 'hello world' });
		done();
	});
	hooks.call('test:hook');
});
