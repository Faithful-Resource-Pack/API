import { ID_FIELD, SearchOption, WriteConfirmation } from "firestorm-db";
import { GalleryEdition, Use, UseRepository, Uses } from "../interfaces";
import { paths, uses } from "../firestorm";

export default class UseFirestormRepository implements UseRepository {
	getUsesByIdsAndEdition(idArr: number[], edition: GalleryEdition): Promise<Uses> {
		const search: SearchOption<Use>[] = [
			{
				field: "texture",
				criteria: "in",
				value: idArr,
			},
		];
		if (edition !== "all")
			search.push({
				field: "edition",
				criteria: "==",
				value: edition,
			});
		return uses.search(search);
	}

	getRaw(): Promise<Record<string, Use>> {
		return uses.readRaw();
	}

	async getUseByIdOrName(idOrName: string): Promise<Uses | Use> {
		try {
			// ! must use return await for try/catch to work properly
			// https://stackoverflow.com/a/42750371/20327257
			return await uses.get(idOrName);
		} catch {
			const out = await uses.search([
				{
					field: "name",
					criteria: "includes",
					value: idOrName,
					ignoreCase: true,
				},
			]);
			return out.filter((use) => use.name !== null);
		}
	}

	async lastCharCode(textureID: string): Promise<number> {
		const foundUses = await uses.search([
			{
				field: "texture",
				criteria: "==",
				value: textureID,
			},
		]);

		return foundUses.reduce(
			(best, cur) => {
				const letter = cur[ID_FIELD].match(/\D/g)?.[0];
				if (!letter) return best;

				const curCode = letter.charCodeAt(0);

				if (curCode > best) return curCode;
				return best;
			}, // subtract one since we're adding one later
			"a".charCodeAt(0) - 1,
		);
	}

	deleteUse(id: string): Promise<WriteConfirmation[]> {
		return this.removeUseById(id);
	}

	async set(use: Use): Promise<Use> {
		await uses.set(use.id, use);
		return uses.get(use.id);
	}

	async setMultiple(useArray: Uses): Promise<Uses> {
		const useIDs = useArray.map((u) => u.id);
		await uses.setBulk(useIDs, useArray);
		return uses.searchKeys(useIDs);
	}

	async removeUseById(useID: string): Promise<[WriteConfirmation, WriteConfirmation]> {
		const gatheredUse = await uses.get(useID); // assure you find the texture and get path method
		const foundPaths = await gatheredUse.getPaths();
		return Promise.all([
			uses.remove(useID),
			paths.removeBulk(foundPaths.map((p) => p[ID_FIELD])), // delete all paths
		]);
	}

	removeUsesByBulk(useIDs: string[]): Promise<[WriteConfirmation, WriteConfirmation][]> {
		return Promise.all(useIDs.map((useID) => this.removeUseById(useID)));
	}
}
