import { ID_FIELD, SearchOption, WriteConfirmation } from "firestorm-db";
import { InputPath, Path, Paths } from "../interfaces";
import { paths } from "../firestorm/textures/paths";
import { settings } from "../firestorm";
import versionSorter from "../tools/versionSorter";

export function getRaw(): Promise<Record<string, Path>> {
	return paths.readRaw();
}

export async function getPathsByUseIdsAndVersion(
	useIDs: string[],
	version: string,
): Promise<Paths> {
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

export function getPathUseById(useID: string): Promise<Paths> {
	return paths.search([
		{
			field: "use",
			criteria: "==",
			value: useID,
		},
	]);
}

export async function createPath(path: InputPath): Promise<Path> {
	const id = await paths.add(path);
	return { ...path, id };
}

export async function createPathBulk(pathArray: InputPath[]): Promise<Paths> {
	const ids = await paths.addBulk(pathArray);
	return paths.searchKeys(ids);
}

export function removePathById(pathID: string): Promise<WriteConfirmation> {
	return paths.remove(pathID);
}

export function removePathsByBulk(pathIDs: string[]): Promise<WriteConfirmation> {
	return paths.removeBulk(pathIDs);
}

export function getPathById(pathID: string): Promise<Path> {
	return paths.get(pathID);
}

export async function updatePath(pathID: string, path: Path): Promise<Path> {
	await paths.set(pathID, path);
	return getPathById(pathID);
}

export async function renameVersion(
	oldVersion: string,
	newVersion: string,
): Promise<WriteConfirmation> {
	const raw = await getRaw();
	return paths.editFieldBulk(
		Object.values(raw)
			.filter((p) => p.versions.includes(oldVersion))
			.map((p) => ({
				id: p[ID_FIELD],
				field: "versions",
				operation: "set",
				// replace old version with new version
				value: p.versions
					.map((v) => (v === oldVersion ? newVersion : v))
					.sort(versionSorter)
					// newest at top
					.reverse(),
			})),
	);
}

export async function removeVersion(version: string): Promise<WriteConfirmation> {
	const raw = await getRaw();
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

export async function addNewVersionToVersion(
	version: string,
	newVersion: string,
): Promise<WriteConfirmation> {
	const raw = await getRaw();
	return paths.editFieldBulk(
		Object.values(raw)
			.filter((p) => p.versions.includes(version))
			.map((p) => ({
				id: p[ID_FIELD],
				field: "versions",
				operation: "array-splice",
				// equivalent of array_unshift (new versions go at start of list)
				value: [0, 0, newVersion],
			})),
	);
}
