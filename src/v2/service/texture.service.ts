import { ID_FIELD, WriteConfirmation } from "firestorm-db";
import { PackID, Texture, Textures, EntireUseToCreate } from "../interfaces";
import {
	Edition,
	EntireTextureToCreate,
	TextureCreationParam,
	TextureProperty,
	PropertyToOutput,
} from "../interfaces/textures";
import TextureFirestormRepository from "../repository/texture.repository";
import PathService from "./path.service";
import UseService from "./use.service";

export default class TextureService {
	private readonly textureRepo = new TextureFirestormRepository();

	private readonly useService = new UseService();

	private readonly pathService = new PathService();

	// eslint-disable-next-line no-use-before-define
	static instance: TextureService;

	static getInstance() {
		if (!TextureService.instance) TextureService.instance = new TextureService();
		return TextureService.instance;
	}

	constructor() {
		TextureService.instance = this;
	}

	getRaw(): Promise<Record<string, Texture>> {
		return this.textureRepo.getRaw();
	}

	getById<Property extends TextureProperty>(
		id: number,
		property: Property,
	): Promise<PropertyToOutput<Property>> {
		if (Number.isNaN(id) || id < 0)
			return Promise.reject(new Error("Texture IDs are integers greater than 0"));
		return this.textureRepo.getTextureById(id, property);
	}

	getByNameIdAndTag(tag: string | undefined, search: string | undefined): Promise<Textures> {
		return this.textureRepo.getByNameIdAndTag(tag, search);
	}

	searchByNameIdAndTag(tag: string | undefined, search: string | undefined): Promise<Textures> {
		return this.textureRepo.getByNameIdAndTag(tag, search, true);
	}

	getVersions(): Promise<string[]> {
		return this.textureRepo.getVersions();
	}

	getVersionByEdition(edition: Edition): Promise<string[]> {
		return this.textureRepo.getVersionByEdition(edition);
	}

	getEditions(): Promise<string[]> {
		return this.textureRepo.getEditions();
	}

	getTags(): Promise<string[]> {
		return this.textureRepo.getTags();
	}

	getResolutions(): Promise<number[]> {
		return this.textureRepo.getResolutions();
	}

	getAnimated(): Promise<number[]> {
		return this.textureRepo.getAnimated();
	}

	getPropertyByNameOrId<Property extends TextureProperty>(
		nameOrID: string | number,
		property: Property,
	): Promise<PropertyToOutput<Property>> {
		return this.textureRepo
			.searchTexturePropertyByNameOrId<Property>(nameOrID, property)
			.catch(() => Promise.reject(new Error("Service failed to make request")));
	}

	// AlwaysID is a typescript hack to make sure the correct types are always returned
	getByNameOrId<AlwaysID extends boolean>(
		nameOrID: string | number,
	): Promise<AlwaysID extends true ? Texture : Texture | Textures> {
		return this.textureRepo.searchTextureByNameOrId<AlwaysID>(nameOrID);
	}

	getURLById(id: number, pack: PackID, version: string): Promise<string> {
		return this.textureRepo.getURLById(id, pack, version);
	}

	async mergeTextures(addID: string, removeID: string) {
		// append the uses of the removed texture to the uses of the kept texture
		const { uses: usesToRemove, paths: pathsToRemove } = await this.getPropertyByNameOrId(
			removeID,
			"all",
		);

		// no need to delete use properties because it gets overwritten later anyways
		const usesToCreate: EntireUseToCreate[] = usesToRemove.map((use) => ({
			...use,
			paths: pathsToRemove
				.filter((p) => p.use === use[ID_FIELD])
				.map((path) => {
					delete path[ID_FIELD];
					delete path.use;
					return path;
				}),
		}));

		await this.useService.appendMultipleUses(addID, usesToCreate);
		await this.deleteTexture(removeID);
	}

	createTexture(texture: TextureCreationParam): Promise<Texture> {
		return this.textureRepo.createTexture(texture);
	}

	async createEntireTexture(input: EntireTextureToCreate): Promise<Texture> {
		const createdTexture = await this.createTexture({
			name: input.name,
			tags: input.tags,
		});

		// set uses and paths in one go
		await this.useService.appendMultipleUses(createdTexture[ID_FIELD], input.uses);
		return createdTexture;
	}

	async createEntireTextures(body: EntireTextureToCreate[]): Promise<Textures> {
		const res: Textures = [];
		// must be done synchronously to prevent id collisions
		for (const tex of body) {
			// eslint-disable-next-line no-await-in-loop
			res.push(await this.createEntireTexture(tex));
		}
		return res;
	}

	async changeTexture(id: string, body: TextureCreationParam): Promise<Texture> {
		await this.getByNameOrId(id);
		return this.textureRepo.changeTexture(id, body);
	}

	deleteTexture(id: string): Promise<WriteConfirmation[]> {
		return this.textureRepo.deleteTexture(id);
	}
}
