import { unzipSync } from "fflate";
import { BadRequestError } from "./errorTypes";

// protect against zip bombs
const MAX_ENTRIES = 50000;
const MAX_TEXTURE_SIZE = 20 * 1024 * 1024;

export interface JarTexture {
	namespace: string;
	path: string; // without extension (ex: "block/stone")
	png: Buffer;
	mcmeta?: Buffer;
}

const TEXTURE_REGEX = /^assets\/([^/]+)\/textures\/(.+)\.png$/;

/** Location of a texture in a jar (and in the version folder of a mod's branch) */
export const jarPath = (namespace: string, path: string) =>
	`assets/${namespace}/textures/${path}.png`;

/** Namespace and extension-less path of a texture from its location in a jar */
export function parseJarPath(path: string): { namespace: string; path: string } | null {
	const match = TEXTURE_REGEX.exec(path);
	return match ? { namespace: match[1], path: match[2] } : null;
}

/**
 * Read every texture (and its .mcmeta) of a mod jar. Nested jars are ignored since
 * their assets belong to other mods.
 */
export function extractJarTextures(jar: Buffer): JarTexture[] {
	let seen = 0;
	const entries = unzipSync(new Uint8Array(jar), {
		filter: (file) => {
			if (++seen > MAX_ENTRIES) throw new BadRequestError("Jar has too many entries");
			if (file.originalSize > MAX_TEXTURE_SIZE) return false;
			return /^assets\/[^/]+\/textures\/.+\.(png|png\.mcmeta)$/.test(file.name);
		},
	});

	const textures: JarTexture[] = [];
	for (const [name, data] of Object.entries(entries)) {
		const match = TEXTURE_REGEX.exec(name);
		if (!match) continue;
		const mcmeta = entries[`${name}.mcmeta`];
		textures.push({
			namespace: match[1],
			path: match[2],
			png: Buffer.from(data),
			mcmeta: mcmeta ? Buffer.from(mcmeta) : undefined,
		});
	}
	return textures.sort((a, b) =>
		`${a.namespace}/${a.path}`.localeCompare(`${b.namespace}/${b.path}`),
	);
}

/**
 * Read width and height from a png header, null if it isn't a png
 */
export function pngSize(png: Buffer): { width: number; height: number } | null {
	if (png.length < 24 || png.readUInt32BE(0) !== 0x89504e47) return null;
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}
