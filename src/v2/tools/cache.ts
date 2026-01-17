import { readFile, readdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync, mkdirSync } from "fs";

const NO_CACHE = process.env.NO_CACHE === "true";

const CACHE_FOLDER = "faithful_api";

const folder = () => {
	const path = join(tmpdir(), CACHE_FOLDER);
	if (!existsSync(path)) mkdirSync(path, { recursive: true });
	return path;
};

const keyToPath = (key: string): string => {
	const escapedKey = key.replace(/(\/|\\)/g, "-");
	return join(folder(), `cache-${escapedKey}.json`);
};

export interface CacheData<T> {
	/** Whether the data has expired */
	expired: boolean;
	/** Found data */
	data?: T;
}

/**
 * Asynchronously read a cache file
 * @param key Cache key to read
 * @param duration Duration cache should persist in seconds (default 1 day)
 * @returns Found data and whether that data has expired
 */
export async function read<T>(key: string, duration = 86400000): Promise<CacheData<T>> {
	if (NO_CACHE) throw new Error("Cache disabled");

	const content = await readFile(keyToPath(key), { encoding: "utf8" });
	const json: Record<string | number, T> = JSON.parse(content);
	const timestampStr = Object.keys(json)[0];
	const timestamp = Number(timestampStr);
	return {
		expired: Date.now() - timestamp > duration,
		data: json[timestampStr],
	};
}

/**
 * Purge API cache for a given pattern
 * @param pattern Purge a specific pattern/file (if not provided purge everything)
 */
export async function purge(pattern?: string | RegExp): Promise<void[]> {
	let regex = /cache-.+\.json$/;
	if (pattern !== undefined) {
		const p = typeof pattern === "string" ? pattern : pattern.toString().split("/")[1];
		regex = new RegExp(`cache-${p}.json$`);
	}
	const entries = await readdir(folder());

	// why is void[] a type
	return Promise.all(
		entries.filter((item) => regex.test(item)).map((item) => unlink(join(folder(), item))),
	);
}

/**
 * Asynchronously write a new cache file
 * @param key Cache key to write
 * @param value Data to write
 */
export function write<T>(key: string, value: T): Promise<void> {
	// this probably isn't the best way to store data but it works
	const json: Record<string | number, T> = {};
	json[Date.now()] = value;
	return writeFile(keyToPath(key), JSON.stringify(json));
}

/**
 * Read cache and write if expired or doesn't exist using callback results
 * @param key Key to write to/read from
 * @param callback Fallback data to use
 * @param duration Duration cache should persist in seconds (default 1 day)
 * @returns Found data
 */
export async function handle<T>(
	key: string,
	callback: () => T | Promise<T>,
	duration?: number, // one day
): Promise<T> {
	const cacheData = await read<T>(key, duration).catch<CacheData<T>>(() => ({
		// no cache file exists or cache is disabled, use callback to regenerate
		expired: true,
	}));

	// generate new data and write it if expired
	if (cacheData.expired || !cacheData.data) {
		cacheData.data = await callback();
		// write if cache enabled
		if (!NO_CACHE) {
			if (process.env.VERBOSE === "true") console.log(`Creating cache ${key} at ${keyToPath(key)}`);
			write(key, cacheData.data).catch((...args) => console.error(...args));
		}
	}

	return cacheData.data;
}
