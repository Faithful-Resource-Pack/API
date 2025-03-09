import { ID_FIELD, SearchOption, WriteConfirmation } from "firestorm-db";
import {
	Edition,
	PackID,
	TextureCreationParam,
	TextureProperty,
	Texture,
	Textures,
	TextureRepository,
	PropertyToOutput,
} from "../interfaces";
import { NotFoundError } from "../tools/errors";
import { textures, paths, uses, contributions, settings, packs } from "../firestorm";
import { MinecraftSorter } from "../tools/sorter";

export default class TextureFirestormRepository implements TextureRepository {
	async getByNameIdAndTag(
		tag: string | undefined,
		search: string | undefined,
		forcePartial = false,
	): Promise<Textures> {
		// * none, read raw
		if (tag === undefined && search === undefined) return Object.values(await this.getRaw());

		// * number id: get + includes tag?
		const numberID = search !== undefined ? Number(search) : NaN;
		if (!Number.isNaN(numberID)) {
			const tex = await textures.get(numberID).catch(() => {});
			if (!tex) return [];

			if (tag === undefined || tex.tags.includes(tag)) return [tex];

			return [];
		}

		// tag or string search
		const criterias: SearchOption<Texture>[] = [];

		if (tag !== undefined) {
			criterias.push({
				field: "tags",
				criteria: "array-contains",
				value: tag,
			});
		}

		// with search
		let partial = forcePartial;
		if (search !== undefined) {
			partial = search.startsWith("_") || search.endsWith("_") || forcePartial;

			criterias.push({
				field: "name",
				criteria: partial ? "includes" : "==",
				value: search,
				ignoreCase: true,
			});
		}

		const results: Textures = await textures.search(criterias);
		if (results.length && search === undefined && !partial) return results;

		// fallback string search criteria to include if empty results
		criterias[criterias.length - 1].criteria = "includes";

		return textures.search(criterias);
	}

	public getRaw(): Promise<Record<string, Texture>> {
		return textures.readRaw();
	}

	public async getURLById(id: number, pack: PackID, version: string) {
		const tex = await textures.get(id);
		return tex.url(pack, version);
	}

	// AlwaysID is a typescript hack to make sure the correct types are always returned
	public searchTextureByNameOrId<AlwaysID extends boolean>(
		nameOrID: string | number,
	): Promise<AlwaysID extends true ? Texture : Texture | Textures> {
		return this.searchTexturePropertyByNameOrId<null>(nameOrID, null) as any;
	}

	public async searchTexturePropertyByNameOrId<Property extends TextureProperty>(
		nameOrID: string | number,
		property: Property,
	): Promise<PropertyToOutput<Property>> {
		// todo: fix the horrible as any type shenanigans everywhere
		const intID = Number(nameOrID);

		if (!Number.isNaN(intID)) return this.getTextureById(intID, property);
		const name = nameOrID.toString();

		/**
		 * TEXTURE SEARCH ALGORITHM
		 * - if starts/ends with "_", partial search => include mode
		 * - if not, the name is considered as full  => exact match mode
		 * - if no results for exact (and search is long enough), switch to include
		 */
		if (name.startsWith("_") || name.endsWith("_")) {
			const partialMatches = await textures.search([
				{ field: "name", criteria: "includes", value: name, ignoreCase: true },
			]);
			if (property === null) return partialMatches as any;
			return Promise.all(partialMatches.map((t) => t[property as string]()));
		}

		return textures
			.search([{ field: "name", criteria: "==", value: name, ignoreCase: true }])
			.then((exactMatches) => {
				// return whatever we have if short name
				if (name.length < 3 || exactMatches.length) return exactMatches;
				// partial search if no exact results found
				return textures.search([
					{ field: "name", criteria: "includes", value: name, ignoreCase: true },
				]);
			})
			.then((includeMatches) => {
				if (property === null) return includeMatches;
				return Promise.all(includeMatches.map((t) => t[property as string]()));
			});
	}

	public async getTextureById<Property extends TextureProperty>(
		id: number,
		property: Property,
	): Promise<PropertyToOutput<Property>> {
		if (Number.isNaN(id) || id < 0)
			return Promise.reject(new Error("Texture IDs must be integers greater than 0."));
		const t = await textures.get(id);
		if (property === null) return t as any;
		return t[property as string]();
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
		return filteredUses.map((u) => u.texture);
	}

	public async getTags(): Promise<string[]> {
		const res = await textures.values({ field: "tags", flatten: true });
		return res.sort();
	}

	public async getVersions(): Promise<string[]> {
		const s = await settings.readRaw(true);
		return Object.values(s.versions as string[])
			.flat()
			.sort(MinecraftSorter)
			.reverse();
	}

	public async getVersionByEdition(edition: Edition): Promise<string[]> {
		const versions: Record<Edition, string[]> = await settings.get("versions");
		if (!versions[edition]) throw new NotFoundError("edition not found");
		return versions[edition];
	}

	public async createTexture(texture: TextureCreationParam): Promise<Texture> {
		const id = await textures.add(texture);
		return this.searchTextureByNameOrId<true>(id);
	}

	public async createTexturesBulk(textureArr: TextureCreationParam[]): Promise<Texture[]> {
		const ids = await textures.addBulk(textureArr);
		return textures.searchKeys(ids);
	}

	public async deleteTexture(id: string): Promise<WriteConfirmation[]> {
		const foundTexture = await textures.get(id);
		const foundUses = await foundTexture.uses();
		const foundPaths = await foundTexture.paths(foundUses);
		const foundContributions = await foundTexture.contributions();

		const promises: Promise<WriteConfirmation>[] = [];
		promises.push(textures.remove(id));
		promises.push(uses.removeBulk(foundUses.map((u) => u[ID_FIELD])));
		promises.push(paths.removeBulk(foundPaths.map((p) => p[ID_FIELD])));
		promises.push(contributions.removeBulk(foundContributions.map((c) => c[ID_FIELD])));

		return Promise.all(promises);
	}

	public async changeTexture(id: string, body: TextureCreationParam): Promise<Texture> {
		const unmapped = { id, ...body };
		await textures.set(id, unmapped);
		return this.searchTextureByNameOrId<true>(id);
	}
}
