import { ID_FIELD, WriteConfirmation } from "firestorm-db";
import { contributions } from "../firestorm";
import { Pack, Packs, PackID, PackSearch, CreationPackAll, PackAll } from "../interfaces";
import * as PackRepo from "../repository/pack.repository";

export default class PackService {
	public getRaw(): Promise<Record<string, Pack>> {
		return PackRepo.getRaw();
	}

	public getById(id: PackID): Promise<Pack> {
		return PackRepo.getById(id);
	}

	public search(params: PackSearch): Promise<Packs> {
		return PackRepo.search(params);
	}

	public getWithSubmission(id: PackID): Promise<PackAll> {
		return PackRepo.getWithSubmission(id);
	}

	public getAllTags(): Promise<string[]> {
		return PackRepo.getAllTags();
	}

	public async renamePack(oldPack: PackID, newPack: string): Promise<WriteConfirmation> {
		PackRepo.renamePack(oldPack, newPack);

		const r = await contributions.readRaw();
		const old = Object.values(r);
		const filtered = old.filter((c) => c.pack === oldPack);
		return contributions.editFieldBulk(
			filtered.map((p) => ({
				id: p[ID_FIELD],
				field: "pack",
				operation: "set",
				value: newPack,
			})),
		);
	}

	public serializeDisplayName(name: string): string {
		// remove special characters and replace spaces with underscores
		return name.toLowerCase().trim().replace(/ /g, "_").replace(/\W/g, "");
	}

	public create(body: CreationPackAll): Promise<CreationPackAll> {
		if (!body.id) body.id = this.serializeDisplayName(body.name);
		return PackRepo.create(body.id, body);
	}

	public update(id: PackID, pack: Pack): Promise<Pack> {
		return PackRepo.update(id, pack);
	}

	public remove(id: PackID): Promise<WriteConfirmation> {
		return PackRepo.remove(id);
	}
}
