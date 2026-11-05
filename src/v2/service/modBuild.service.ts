import axios from "axios";
import { zipSync } from "fflate";
import { ModBuildBody, ModContribution, Pack } from "../interfaces";
import { BadRequestError } from "../tools/errorTypes";
import { getFileContent } from "../tools/github";
import ModsService from "./mods.service";
import PackService from "./pack.service";
import TextureService from "./texture.service";

const CONCURRENCY = 8;

/** Run a task on every item, a few at a time */
async function mapLimit<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
			while (next < items.length) {
				const index = next++;
				out[index] = await task(items[index]);
			}
		}),
	);
	return out;
}

export default class ModBuildService {
	private readonly modsService = new ModsService();
	private readonly packService = new PackService();
	private readonly textureService = new TextureService();

	/**
	 * Resource pack (zip) with the textures a pack made for the selected mod versions. A texture comes from
	 * the pack's contribution on the mod, or else from the vanilla texture it is linked to. Textures with no
	 * contribution are left out, so the game falls back to the originals.
	 */
	async buildMods(body: ModBuildBody): Promise<Uint8Array> {
		const pack = await this.packService.getById(body.pack);
		const github = pack.github.modded;
		if (!github?.repo) throw new BadRequestError(`Pack "${pack.id}" has no modded repository`);
		if (!body.mod_version_ids.length) throw new BadRequestError("Select at least one mod version");

		const mods = await this.modsService.getRaw();
		const versions = await Promise.all(
			body.mod_version_ids.map((id) => this.modsService.getVersionById(id)),
		);

		const seenMods = new Set<string>();
		for (const version of versions) {
			if (version.status !== "extracted" || !version.minecraft.includes(body.minecraft))
				throw new BadRequestError(
					`Mod version ${version.id} isn't available for Minecraft ${body.minecraft}`,
				);
			if (seenMods.has(version.mod_id))
				throw new BadRequestError("Only one version per mod can be selected");
			seenMods.add(version.mod_id);
		}

		const files: Record<string, Uint8Array> = {};
		for (const version of versions) {
			const mod = mods[version.mod_id];
			const textures = await this.modsService.getTexturesByVersion(version.id);

			// the latest contribution of the pack for each texture
			const latest = new Map<string, ModContribution>();
			for (const c of await this.modsService.getContributions(mod.id, { pack: pack.id })) {
				const current = latest.get(c.mod_texture_id);
				if (!current || current.date < c.date) latest.set(c.mod_texture_id, c);
			}

			await mapLimit(textures, async (texture) => {
				const jarPath = Object.keys(texture.paths).find((p) =>
					texture.paths[p].includes(version.id),
				);
				if (!jarPath || texture.blacklisted) return;

				let image: Buffer | null = null;
				if (latest.has(texture.id)) {
					image = await getFileContent(
						github.org,
						github.repo,
						mod.slug,
						`${version.version}/${jarPath}`,
					);
				} else if (texture.vanilla_id !== undefined) {
					image = await this.getVanillaImage(texture.vanilla_id, pack.id);
				}
				if (!image) return;

				// textures used at several paths of the version are copied to all of them
				for (const path of Object.keys(texture.paths)) {
					if (!texture.paths[path].includes(version.id)) continue;
					files[path] = image;
					if (texture.mcmeta)
						files[`${path}.mcmeta`] = Buffer.from(JSON.stringify(texture.mcmeta), "utf8");
				}
			});
		}

		if (!Object.keys(files).length)
			throw new BadRequestError("This pack has no textures for the selected mods");

		files["pack.mcmeta"] = await this.getPackMcmeta(pack, body.minecraft);

		return zipSync(files);
	}

	/** pack.mcmeta of the pack's Java repository for a Minecraft version (branches are named after versions) */
	private async getPackMcmeta(pack: Pack, minecraft: string): Promise<Buffer> {
		const github = pack.github.java;
		const mcmeta = github?.repo
			? await getFileContent(github.org, github.repo, minecraft, "pack.mcmeta")
			: null;
		if (!mcmeta) throw new BadRequestError(`No pack.mcmeta found for ${pack.name} ${minecraft}`);
		return mcmeta;
	}

	/** Latest texture of a pack for a vanilla texture, null if it has none */
	private async getVanillaImage(vanillaId: number, pack: string): Promise<Buffer | null> {
		try {
			const url = await this.textureService.getURLById(vanillaId, pack, "latest");
			const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
			return Buffer.from(res.data);
		} catch {
			return null;
		}
	}
}
