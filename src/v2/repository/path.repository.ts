import { ID_FIELD, SearchOption, WriteConfirmation } from "firestorm-db";
import { InputPath, Path, Paths, PathRepository } from "../interfaces";
import { paths } from "../firestorm/textures/paths";
import { settings } from "../firestorm";

export default class PathFirestormRepository implements PathRepository {
	getRaw(): Promise<Record<string, Path>> {
		return paths.readRaw();
	}

	async getPathsByUseIdsAndVersion(useIDs: string[], version: string): Promise<Paths> {
		const search: SearchOption<Path>[] = [
			{
				field: "use",
				criteria: "in",
				value: useIDs,
			},
		];

		if (version === "latest") {
			const s = await settings.readRaw(true);
			search.push({
				field: "versions",
				criteria: "array-contains-any",
				value: Object.entries<string[]>(s.versions)
					.filter(([k]) => k !== ID_FIELD)
					// latest is always at top
					.map(([, obj]) => obj[0]),
			});
		} else
			search.push({
				field: "versions",
				criteria: "array-contains",
				value: version,
			});
		return paths.search(search);
	}

	getPathUseById(useID: string): Promise<Paths> {
		return paths.search([
			{
				field: "use",
				criteria: "==",
				value: useID,
			},
		]);
	}

	async createPath(path: InputPath): Promise<Path> {
		const id = await paths.add(path);
		return { ...path, id };
	}

	async createPathBulk(pathArray: InputPath[]): Promise<Paths> {
		const ids = await paths.addBulk(pathArray);
		return paths.searchKeys(ids);
	}

	removePathById(pathID: string): Promise<WriteConfirmation> {
		return paths.remove(pathID);
	}

	removePathsByBulk(pathIDs: string[]): Promise<WriteConfirmation> {
		return paths.removeBulk(pathIDs);
	}

	getPathById(pathID: string): Promise<Path> {
		return paths.get(pathID);
	}

	async updatePath(pathID: string, path: Path): Promise<Path> {
		await paths.set(pathID, path);
		return this.getPathById(pathID);
	}

	async modifyVersion(oldVersion: string, newVersion: string): Promise<WriteConfirmation> {
		const raw = await this.getRaw();
		return paths.editFieldBulk(
			Object.values(raw)
				.filter((p) => p.versions.includes(oldVersion))
				.map((p) => ({
					id: p[ID_FIELD],
					field: "versions",
					operation: "set",
					// replace old version with new version
					value: p.versions.map((v) => (v === oldVersion ? newVersion : v)),
				})),
		);
	}

	async removeVersion(version: string): Promise<WriteConfirmation> {
		const raw = await this.getRaw();
		return paths.editFieldBulk(
			Object.values(raw)
				.filter((p) => p.versions.includes(version))
				.map((p) => ({
					id: p[ID_FIELD],
					field: "versions",
					operation: "set",
					value: p.versions.filter((v) => v !== version),
				})),
		);
	}

	async addNewVersionToVersion(version: string, newVersion: string): Promise<WriteConfirmation> {
		const raw = await this.getRaw();
		return paths.editFieldBulk(
			Object.values(raw)
				.filter((p) => p.versions.includes(version))
				.map((p) => ({
					id: p[ID_FIELD],
					field: "versions",
					operation: "array-push",
					// add new version to version array
					value: newVersion,
				})),
		);
	}
}
