import { WriteConfirmation } from "firestorm-db";
import {
	CreationUse,
	EntireUseToCreate,
	GalleryEdition,
	InputPath,
	Path,
	Use,
} from "../interfaces";
import UseFirestormRepository from "../repository/use.repository";
import { BadRequestError, NotFoundError } from "../tools/errorTypes";
import PathService from "./path.service";

export default class UseService {
	private readonly pathService: PathService;

	// workaround for the classes requiring each other (infinite loop)
	constructor(service?: PathService) {
		if (service !== undefined) this.pathService = service;
		else this.pathService = new PathService(this);
		// this.textureService = TextureService.getInstance();
	}

	private readonly repo = new UseFirestormRepository();

	async getPathUseByIdOrName(idOrName: string): Promise<Path[]> {
		const use = await this.getUseById(idOrName);
		return this.pathService.getPathsByUseId(use.id);
	}

	getRaw(): Promise<Record<string, Use>> {
		return this.repo.getRaw();
	}

	getUseById(id: number | string): Promise<Use> {
		return this.repo.getUseById(id);
	}

	getUseByIdOrName(idOrName: string): Promise<Use | Use[]> {
		return this.repo.getUseByIdOrName(idOrName);
	}

	async doesUseExist(idOrName: string): Promise<boolean> {
		const res = await this.getUseByIdOrName(idOrName);
		return Array.isArray(res) ? res.length > 0 : res !== undefined;
	}

	async updateUse(id: string, modifiedUse: CreationUse): Promise<Use> {
		const exists = await this.doesUseExist(id);
		if (!exists) throw new NotFoundError("Use ID not found");
		return this.repo.set({
			id,
			...modifiedUse,
		});
	}

	removeUseById(id: string): Promise<WriteConfirmation[]> {
		return this.repo.removeUseById(id);
	}

	getUsesByIds(idArr: number[]): Promise<Use[]> {
		return this.repo.getUsesByIds(idArr);
	}

	async createUse(use: Use): Promise<Use> {
		const exists = await this.doesUseExist(use.id);
		if (exists) throw new BadRequestError(`Texture use ID ${use.id} already exists`);

		return this.repo.set(use);
	}

	async createMultipleUses(uses: Use[]): Promise<Use[]> {
		const exists = await Promise.all(uses.map((u) => this.doesUseExist(u.id)));
		if (exists.some((u) => u)) throw new BadRequestError(`A use ID already exists`);
		return this.repo.setMultiple(uses);
	}

	// used for editing an existing texture
	async appendUse(textureID: string, use: EntireUseToCreate): Promise<[Use, Path[]]> {
		const lastCharCode = await this.repo.lastCharCode(textureID);
		const nextLetter = String.fromCharCode(lastCharCode + 1);
		const newUseID = `${textureID}${nextLetter}`;
		const pathsWithUse: InputPath[] = use.paths.map((p) => ({ ...p, use: newUseID }));

		const useToCreate = {
			id: newUseID,
			name: use.name,
			edition: use.edition,
			texture: Number(textureID),
		};

		return Promise.all([
			this.createUse(useToCreate),
			pathsWithUse.length
				? this.pathService.createMultiplePaths(pathsWithUse)
				: Promise.resolve([]),
		]);
	}

	async generateAppendableUses(
		textureID: string,
		uses: EntireUseToCreate[],
		firstUse = false,
	): Promise<{ pathsToCreate: InputPath[]; usesToCreate: Use[] }> {
		// using firstUse saves a request for each use added when adding a texture
		const lastCharCode = firstUse ? "a".charCodeAt(0) - 1 : await this.repo.lastCharCode(textureID);
		const pathsToCreate: InputPath[] = [];
		const usesToCreate = uses.map((use, charOffset) => {
			// add one to start after the previous letter
			const nextLetter = String.fromCharCode(lastCharCode + 1 + charOffset);
			const newUseID = `${textureID}${nextLetter}`;
			// flat paths array to save requests
			if (use.paths?.length) {
				pathsToCreate.push(
					...use.paths.map((p: InputPath) => {
						p.use = newUseID;
						return p;
					}),
				);
			}
			return {
				id: newUseID,
				name: use.name,
				edition: use.edition,
				texture: Number(textureID),
			};
		});

		return { pathsToCreate, usesToCreate };
	}

	// used when adding a new texture
	async appendMultipleUses(textureID: string, uses: EntireUseToCreate[]): Promise<[Use[], Path[]]> {
		const { pathsToCreate, usesToCreate } = await this.generateAppendableUses(textureID, uses);

		return Promise.all([
			this.createMultipleUses(usesToCreate),
			pathsToCreate.length
				? this.pathService.createMultiplePaths(pathsToCreate)
				: Promise.resolve([]),
		]);
	}
}
