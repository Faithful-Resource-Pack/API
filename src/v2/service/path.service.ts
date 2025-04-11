import { WriteConfirmation } from "firestorm-db";
import { BadRequestError } from "../tools/errors";
import UseService from "./use.service";
import { InputPath, Path, PathNewVersionParam, Paths } from "../interfaces";
import PathFirestormRepository from "../repository/path.repository";
import TextureService from "./texture.service";
import { settings } from "../firestorm";

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

	getPathByUseId(useID: string): Promise<Paths> {
		return this.repo.getPathUseById(useID);
	}

	async getPathsByUseIdsAndVersion(
		useIDs: string[],
		version: string,
	): Promise<Record<string, Path>> {
		// return object for faster lookup
		const paths = await this.repo.getPathsByUseIdsAndVersion(useIDs, version);
		return paths.reduce((acc, cur) => {
			// return after first path found (usually the most important one is first)
			if (acc[cur.use]) return acc;
			acc[cur.use] = cur;
			return acc;
		}, {});
	}

	async createPath(path: InputPath): Promise<Path> {
		// verify use existence
		await this.useService.getUseByIdOrName(path.use); // verify use existence
		return this.repo.createPath(path);
	}

	createMultiplePaths(paths: InputPath[]): Promise<Paths> {
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

	async modifyVersion(oldVersion: string, newVersion: string): Promise<WriteConfirmation> {
		const allVersions: Record<string, string[]> = await settings.get("versions");
		const edition = Object.entries(allVersions).find((v) => v[1].includes(oldVersion))?.[0];

		settings.editField({
			id: "versions",
			field: edition,
			operation: "set",
			// map old version to new version, keep the rest the same
			value: allVersions[edition].map((v) => (v === oldVersion ? newVersion : v)),
		});

		return this.repo.modifyVersion(oldVersion, newVersion);
	}

	async removeVersion(version: string): Promise<WriteConfirmation> {
		const allVersions: Record<string, string[]> = await settings.get("versions");
		const edition = Object.entries(allVersions).find((v) => v[1].includes(version))?.[0];

		settings.editField({
			id: "version",
			field: edition,
			operation: "set",
			value: allVersions[edition].filter((v) => v !== version),
		});

		return this.repo.removeVersion(version);
	}

	async addVersion(body: PathNewVersionParam): Promise<WriteConfirmation> {
		// stupid workaround for recursion (the classes require each other)
		const versions = await TextureService.getInstance().getVersionByEdition(body.edition);

		// check existing version to the paths provided
		if (!versions.includes(body.version))
			throw new BadRequestError("Incorrect input path version provided");

		settings.editField({
			id: "versions",
			field: body.edition,
			operation: "array-splice",
			// equivalent of array_unshift (new versions go at start of list)
			value: [0, 0, body.newVersion],
		});

		return this.repo.addNewVersionToVersion(body.version, body.newVersion);
	}

	removePathById(pathID: string): Promise<WriteConfirmation> {
		return this.repo.removePathById(pathID);
	}

	removePathByBulk(pathIDs: string[]): Promise<WriteConfirmation> {
		return this.repo.removePathsByBulk(pathIDs);
	}
}
