import { ID_FIELD, WriteConfirmation } from "firestorm-db";
import { contributions } from "../firestorm";
import { CreationPackAll, Pack, PackAll, PackID, PackSearch } from "../interfaces";
import PackFirestormRepository from "../repository/pack.repository";

export default class PackService {
	private readonly repo = new PackFirestormRepository();

	public getRaw(): Promise<Record<string, Pack>> {
		return this.repo.getRaw();
	}

	public getById(id: PackID): Promise<Pack> {
		return this.repo.getById(id);
	}

	public search(params: PackSearch): Promise<Pack[]> {
		return this.repo.search(params);
	}

	public getWithSubmission(id: PackID): Promise<PackAll> {
		return this.repo.getWithSubmission(id);
	}

	public getAllTags(): Promise<string[]> {
		return this.repo.getAllTags();
	}

	public async renamePack(oldPack: PackID, newPack: string): Promise<WriteConfirmation> {
		this.repo.renamePack(oldPack, newPack);

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
		return this.repo.create(body.id, body);
	}

	public update(id: PackID, pack: Pack): Promise<Pack> {
		return this.repo.update(id, pack);
	}

	public remove(id: PackID): Promise<WriteConfirmation> {
		return this.repo.remove(id);
	}
}
