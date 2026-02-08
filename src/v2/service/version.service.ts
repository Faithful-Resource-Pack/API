import { WriteConfirmation } from "firestorm-db";
import { BadRequestError, NotFoundError } from "../tools/errorTypes";
import { settings } from "../firestorm";
import PathFirestormRepository from "../repository/path.repository";
import versionSorter from "../tools/versionSorter";
import { Edition, NewVersionParam } from "../interfaces";

export default class VersionService {
	private readonly pathRepo = new PathFirestormRepository();

	async getRaw(): Promise<Record<Edition, string[]>> {
		const s = await settings.readRaw(true);
		return s.versions as Record<Edition, string[]>;
	}

	async getFlat(): Promise<string[]> {
		const versions = await this.getRaw();
		return Object.values(versions).flat().sort(versionSorter).reverse();
	}

	async getVersionByEdition(edition: Edition): Promise<string[]> {
		const versions: Record<Edition, string[]> = await settings.get("versions");
		if (!versions[edition])
			throw new NotFoundError(
				`Edition ${edition} not found. Available editions: ${Object.keys(versions).join(", ")}`,
			);
		return versions[edition];
	}

	async add(body: NewVersionParam): Promise<WriteConfirmation[]> {
		const versions = await this.getVersionByEdition(body.edition);

		if (body.template === undefined)
			return Promise.all([
				settings.editField({
					id: "versions",
					field: body.edition,
					operation: "array-splice",
					// equivalent of array_unshift (new versions go at start of list)
					value: [0, 0, body.version],
				}),
			]);

		// check existing version to the paths provided
		if (!versions.includes(body.template))
			throw new BadRequestError("Incorrect input path version provided");

		return Promise.all([
			settings.editField({
				id: "versions",
				field: body.edition,
				operation: "array-splice",
				// equivalent of array_unshift (new versions go at start of list)
				value: [0, 0, body.version],
			}),
			this.pathRepo.addNewVersionToVersion(body.template, body.version),
		]);
	}

	async rename(oldVersion: string, newVersion: string): Promise<WriteConfirmation[]> {
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
			this.pathRepo.renameVersion(oldVersion, newVersion),
		]);
	}

	async remove(version: string): Promise<WriteConfirmation[]> {
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
			this.pathRepo.removeVersion(version),
		]);
	}
}
