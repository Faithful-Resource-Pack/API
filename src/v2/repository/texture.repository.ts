import { ID_FIELD, SearchOption, WriteConfirmation } from "firestorm-db";
import {
	Edition,
	FirestormTexture,
	PackID,
	PropertyToOutput,
	Texture,
	TextureCreationParam,
	TextureProperty,
	TextureRepository,
} from "../interfaces";
import { NotFoundError } from "../tools/errorTypes";
import { contributions, packs, paths, settings, textures, uses } from "../firestorm";
import versionSorter from "../tools/versionSorter";

export default class TextureFirestormRepository implements TextureRepository {
	public getRaw(): Promise<Record<string, FirestormTexture>> {
		return textures.readRaw();
	}

	async getById(id: string | number) {
		return textures.get(id);
	}

	async search(
		nameOrId: string | number | undefined,
		tag?: string,
		forcePartial = false,
	): Promise<FirestormTexture | FirestormTexture[]> {
		// no name, get all textures with tag
		if (!nameOrId) {
			if (tag) return textures.search([{ field: "tags", criteria: "array-contains", value: tag }]);
			// no specified tag or name, just get everything
			return Object.values(await this.getRaw());
		}

		// unique id: get + filter if tag
		const intID = Number(nameOrId);
		if (!Number.isNaN(intID)) {
			if (intID < 0) throw new TypeError("Texture IDs must be integers greater than 0.");
			const tex = await textures.get(intID).catch<null>(() => null);
			if (!tex) return [];

			if (tag === undefined || tex.tags.includes(tag)) return tex;
			return [];
		}

		const name = nameOrId.toString();

		// now we know that there must be a valid string name to search

		/**
		 * TEXTURE NAME SEARCH ALGORITHM
		 * - if starts/ends with "_", partial search => include mode
		 * - if not, the name is considered as full  => exact match mode
		 * - if no results for exact (and search is long enough), switch to include
		 */

		const tagCriteria: SearchOption<Texture> = {
			field: "tags",
			criteria: "array-contains",
			value: tag,
		};

		// trick to reuse search code regardless of whether a tag is specified or not
		const tagSearchOption = tag ? [tagCriteria] : [];

		if (forcePartial || name.startsWith("_") || name.endsWith("_")) {
			return textures.search([
				{ field: "name", criteria: "includes", value: name, ignoreCase: true },
				...tagSearchOption,
			]);
		}

		const exactMatches = await textures.search([
			{ field: "name", criteria: "==", value: name, ignoreCase: true },
			...tagSearchOption,
		]);

		// return whatever we have if short name
		if (name.length < 3 || exactMatches.length) return exactMatches;
		// partial search if no exact results found
		return textures.search([
			{ field: "name", criteria: "includes", value: name, ignoreCase: true },
			...tagSearchOption,
		]);
	}

	public async searchProperty<Property extends TextureProperty>(
		nameOrID: string | number,
		property: Property,
		tag?: string,
	): Promise<PropertyToOutput<Property>> {
		// all the horrible type shenanigans are now more or less isolated to this function only
		const results = await this.search(nameOrID, tag);
		if (property === null) return results as any;
		if (Array.isArray(results)) return Promise.all(results.map((res) => res[property as string]()));
		return results[property as string]();
	}

	public async getURLById(id: number, pack: PackID, version: string): Promise<string> {
		const tex = await textures.get(id);
		return tex.url(pack, version);
	}

	public async getEditions(): Promise<string[]> {
		const res = await uses.values({ field: "edition" });
		return res.sort();
	}

	public async getResolutions(): Promise<number[]> {
		const res = await packs.values({ field: "resolution" });
		return res.sort();
	}

	public async getAnimated(): Promise<number[]> {
		const filteredPaths = await paths.search([
			{
				field: "mcmeta",
				criteria: "==",
				value: true,
			},
		]);
		const filteredUses = await uses.searchKeys(filteredPaths.map((p) => p.use));
		return Array.from(new Set(filteredUses.map((u) => u.texture)));
	}

	public async getTags(): Promise<string[]> {
		const res = await textures.values({ field: "tags", flatten: true });
		return res.sort();
	}

	public async getVersions(): Promise<string[]> {
		const s = await settings.readRaw(true);
		return Object.values(s.versions as string[])
			.flat()
			.sort(versionSorter)
			.reverse();
	}

	public async getVersionByEdition(edition: Edition): Promise<string[]> {
		const versions: Record<Edition, string[]> = await settings.get("versions");
		if (!versions[edition])
			throw new NotFoundError(
				`Edition ${edition} not found. Available editions: ${Object.keys(versions).join(", ")}`,
			);
		return versions[edition];
	}

	public async createTexture(texture: TextureCreationParam): Promise<Texture> {
		const id = await textures.add(texture);
		return textures.get(id);
	}

	public async createTexturesBulk(textureArr: TextureCreationParam[]): Promise<Texture[]> {
		const ids = await textures.addBulk(textureArr);
		return textures.searchKeys(ids);
	}

	public async editTexture(id: string, body: TextureCreationParam): Promise<Texture> {
		const unmapped = { id, ...body };
		await textures.set(id, unmapped);
		return textures.get(id);
	}

	public async deleteTexture(id: string): Promise<WriteConfirmation[]> {
		const foundTexture = await textures.get(id);
		const foundUses = await foundTexture.uses();
		const foundPaths = await foundTexture.paths(foundUses);
		const foundContributions = await foundTexture.contributions();

		return Promise.all([
			textures.remove(id),
			uses.removeBulk(foundUses.map((u) => u[ID_FIELD])),
			paths.removeBulk(foundPaths.map((p) => p[ID_FIELD])),
			contributions.removeBulk(foundContributions.map((c) => c[ID_FIELD])),
		]);
	}
}
