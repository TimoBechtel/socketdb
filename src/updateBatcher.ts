import { mergeDiff } from './utils';

type Queue = (diff: any) => void;

export function createUpdateBatcher(
	flush: (diff: any) => void,
	updateInterval: number
): Queue {
	if (!updateInterval) return flush;

	let queuedUpdate: any;
	let pendingUpdate = null;

	// WARNING: queue function has sideeffects,
	// as diff is merged in place
	return (diff: any) => {
		if (pendingUpdate) {
			mergeDiff(diff, queuedUpdate);
		} else {
			queuedUpdate = diff;
			pendingUpdate = setTimeout(() => {
				pendingUpdate = null;
				flush(queuedUpdate);
			}, updateInterval);
		}
	};
}
