const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const MC_VERSION = /^(\d+\.\d+(\.\d+)?|\d{2}w\d{2}[a-z])$/;

// loaders are sometimes part of the version (ex: forge-13.0.10-beta, 1.2.3-fabric)
// neoforge goes before forge so the regex prefers the longer name
export const MOD_LOADERS = ["neoforge", "forge", "fabric", "quilt", "liteloader", "rift"];
const LOADER = `(?:${MOD_LOADERS.join("|")})`;
const LOADER_PREFIX = new RegExp(`^${LOADER}[-_+ ]+`, "i");
const LOADER_SUFFIX = new RegExp(`[-_+ ]+${LOADER}$`, "i");

/**
 * Convert a version string to semver if it can be done without guessing
 * @returns Semver string, or null if it needs to be provided manually
 */
function toSemver(raw: string): string | null {
	const trimmed = raw
		.trim()
		.replace(LOADER_PREFIX, "")
		.replace(LOADER_SUFFIX, "")
		.replace(/^v(?=\d)/i, "");
	if (SEMVER.test(trimmed)) return trimmed;
	// 1.2 -> 1.2.0
	if (/^\d+\.\d+$/.test(trimmed)) return `${trimmed}.0`;
	return null;
}

/**
 * Convert a platform's version text to semver, ignoring a loader or minecraft version around it
 * (ex: "forge-1.19.2-12.9.7" with minecraft 1.19.2 -> 12.9.7)
 */
export function parseVersion(raw: string, minecraft: string[]): string | null {
	let text = raw.trim().replace(LOADER_PREFIX, "").replace(LOADER_SUFFIX, "");
	for (const mc of minecraft) {
		const escaped = mc.replace(/\./g, "\\.");
		text = text
			.replace(new RegExp(`^${escaped}[-_+ ]+`), "")
			.replace(new RegExp(`[-_+ ]+${escaped}$`), "");
	}
	return toSemver(text);
}

/**
 * Guess a mod version from a file name, ignoring tokens that are minecraft versions
 * (ex: "aether-1.20.1-2.3.4.jar" with minecraft 1.20.1 -> 2.3.4)
 */
export function versionFromFilename(filename: string, minecraft: string[]): string | null {
	const base = filename.replace(/\.jar$/i, "");
	const candidates = base.match(/(?<![\d.])\d+\.\d+(?:\.\d+)?(?![\d.])/g) ?? [];
	for (const candidate of candidates) {
		if (minecraft.includes(candidate)) continue;
		const semver = toSemver(candidate);
		if (semver) return semver;
	}
	return null;
}

export const isMinecraftVersion = (v: string) => MC_VERSION.test(v);

// versions are folder names in the contribution repositories
export const SAFE_VERSION = /^[0-9A-Za-z][0-9A-Za-z._+-]*$/;

// regex given to new mods, converted versions are semver
export const DEFAULT_VERSION_VALIDATOR = SEMVER.source;
