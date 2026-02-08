import { WriteConfirmation } from "firestorm-db";
import { BadRequestError } from "../tools/errorTypes";
import UseService from "./use.service";
import { InputPath, Path } from "../interfaces";
import PathFirestormRepository from "../repository/path.repository";

export default class PathService {
	private readonly useService: UseService;

	// workaround for the classes requiring each other (infinite loop)
	constructor(service?: UseService) {
		if (service !== undefined) this.useService = service;
		else this.useService = new UseService(this);
	}

	private readonly repo = new PathFirestormRepository();

	getRaw(): Promise<Record<string, Path>> {
		return this.repo.getRaw();
	}

	getPathsByUseId(useID: string): Promise<Path[]> {
		return this.repo.getPathUseById(useID);
	}

	async getPathsByUseIdsAndVersion(
		useIDs: string[],
		version: string,
	): Promise<Record<string, Path>> {
		// return object for faster lookup
		const paths = await this.repo.getPathsByUseIdsAndVersion(useIDs, version);
		return paths.reduce<Record<string, Path>>((acc, cur) => {
			// only take first path
			acc[cur.use] ??= cur;
			return acc;
		}, {});
	}

	async createPath(path: InputPath): Promise<Path> {
		// verify use existence
		await this.useService.getUseByIdOrName(path.use); // verify use existence
		return this.repo.createPath(path);
	}

	createMultiplePaths(paths: InputPath[]): Promise<Path[]> {
		return this.repo.createPathBulk(paths);
	}

	getPathById(id: string): Promise<Path> {
		return this.repo.getPathById(id);
	}

	async updatePathById(id: string, path: Path): Promise<Path> {
		if (id !== path.id) throw new BadRequestError("Updated ID is different from existing ID");

		await this.useService.getUseByIdOrName(path.use); // verify use existence
		return this.repo.updatePath(id, path);
	}

	removePathById(pathID: string): Promise<WriteConfirmation> {
		return this.repo.removePathById(pathID);
	}

	removePathByBulk(pathIDs: string[]): Promise<WriteConfirmation> {
		return this.repo.removePathsByBulk(pathIDs);
	}
}
