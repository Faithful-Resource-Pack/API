/* eslint-disable radix */
/* eslint-disable no-plusplus */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-underscore-dangle */

/**
 * Sort Minecraft Version Numbers
 * Use this function as a filter for the sort() method:
 * [].sort(MinecraftSorter)
 */
export const MinecraftSorter = (a: string, b: string): number => {
	const _a = a.split(".").map((s) => parseInt(s));
	const _b = b.split(".").map((s) => parseInt(s));

	const upper = Math.min(_a.length, _b.length);
	let i = 0;
	let res = 0;

	while (i < upper && res === 0) {
		res = _a[i] === _b[i] ? 0 : _a[i] < _b[i] ? -1 : 1; // each number
		i++;
	}

	if (res !== 0) return res;
	return _a.length === _b.length ? 0 : _a.length < _b.length ? -1 : 1; // longer length wins
};
