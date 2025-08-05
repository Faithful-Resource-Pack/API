import { WriteConfirmation } from "firestorm-db";
import { BadRequestError, NotFoundError } from "../tools/errorTypes";
import UseService from "./use.service";
import { InputPath, Path, PathNewVersionParam, Paths } from "../interfaces";
import PathFirestormRepository from "../repository/path.repository";
import TextureService from "./texture.service";
import { settings } from "../firestorm";
import versionSorter from "../tools/versionSorter";

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

	async addVersion(body: PathNewVersionParam): Promise<[WriteConfirmation, WriteConfirmation]> {
		// stupid workaround for recursion (the classes require each other)
		const versions = await TextureService.getInstance().getVersionByEdition(body.edition);

		// check existing version to the paths provided
		if (!versions.includes(body.version))
			throw new BadRequestError("Incorrect input path version provided");

		return Promise.all([
			settings.editField({
				id: "versions",
				field: body.edition,
				operation: "array-splice",
				// equivalent of array_unshift (new versions go at start of list)
				value: [0, 0, body.newVersion],
			}),
			this.repo.addNewVersionToVersion(body.version, body.newVersion),
		]);
	}

	async removeVersion(version: string): Promise<[WriteConfirmation, WriteConfirmation]> {
		const allVersions: Record<string, string[]> = await settings.get("versions");
		const edition = Object.entries(allVersions).find((v) => v[1].includes(version))?.[0];

		if (!edition) throw new NotFoundError(`Matching edition not found for version ${version}`);

		return Promise.all([
			settings.editField({
				id: "versions",
				field: edition,
				operation: "set",
				value: allVersions[edition].filter((v) => v !== version),
			}),
			this.repo.removeVersion(version),
		]);
	}

	async renameVersion(
		oldVersion: string,
		newVersion: string,
	): Promise<[WriteConfirmation, WriteConfirmation]> {
		const allVersions: Record<string, string[]> = await settings.get("versions");
		const edition = Object.entries(allVersions).find((v) => v[1].includes(oldVersion))?.[0];
		if (!edition) throw new NotFoundError(`Matching edition not found for version ${oldVersion}`);

		return Promise.all([
			settings.editField({
				id: "versions",
				field: edition,
				operation: "set",
				// map old version to new version, keep the rest the same
				value: allVersions[edition]
					.map((v) => (v === oldVersion ? newVersion : v))
					.sort(versionSorter)
					// newest at top
					.reverse(),
			}),
			this.repo.renameVersion(oldVersion, newVersion),
		]);
	}

	removePathById(pathID: string): Promise<WriteConfirmation> {
		return this.repo.removePathById(pathID);
	}

	removePathByBulk(pathIDs: string[]): Promise<WriteConfirmation> {
		return this.repo.removePathsByBulk(pathIDs);
	}
}
