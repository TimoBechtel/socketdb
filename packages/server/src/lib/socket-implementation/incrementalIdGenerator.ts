export function createIncrementalIdGenerator() {
	let id = 0;
	return () => id++ + '';
}
