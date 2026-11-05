// jobs run one at a time in-process, enough for admin-triggered imports
let tail: Promise<unknown> = Promise.resolve();

export function enqueue<T>(job: () => Promise<T>): Promise<T> {
	const run = tail.then(job, job);
	tail = run.catch(() => undefined);
	return run;
}

const keyedTails = new Map<string, Promise<unknown>>();

/**
 * Run jobs sharing a key one at a time, jobs with other keys are not held back
 */
export function enqueueKeyed<T>(key: string, job: () => Promise<T>): Promise<T> {
	const previous = keyedTails.get(key) ?? Promise.resolve();
	const run = previous.then(job, job);
	const tail = run.catch(() => undefined);
	keyedTails.set(key, tail);
	// nothing queued behind this one anymore
	void tail.then(() => {
		if (keyedTails.get(key) === tail) keyedTails.delete(key);
	});
	return run;
}

/**
 * Run a function on every item with at most `limit` running at once
 */
export async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (next < items.length) await fn(items[next++]);
		}),
	);
}
