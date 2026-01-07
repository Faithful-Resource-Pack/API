import { WriteConfirmation } from "firestorm-db";
import { addons, files } from "../firestorm";
import { Addon, AddonRepository, AddonStatus, CreationAddon, File } from "../interfaces";

export default class AddonFirestormRepository implements AddonRepository {
	getRaw(): Promise<Record<string, Addon>> {
		return addons.readRaw();
	}

	getAddonById(id: number): Promise<Addon> {
		return addons.get(id);
	}

	async getFilesById(addonId: string | number): Promise<File[]> {
		return files.search([
			{
				field: "parent.id",
				criteria: "==",
				value: addonId,
			},
			{
				field: "parent.type",
				criteria: "==",
				value: "addons",
			},
		]);
	}

	getAddonByStatus(status: AddonStatus): Promise<Addon[]> {
		return addons.search([
			{
				criteria: "==",
				field: "approval.status",
				value: status,
			},
		]);
	}

	async getAddonBySlug(slug: string): Promise<Addon | undefined> {
		const results = await addons.search([
			{
				criteria: "==",
				field: "slug",
				value: slug,
			},
		]);
		return results[0];
	}

	async create(addon: CreationAddon): Promise<Addon> {
		const id = await addons.add(addon);
		return addons.get(id);
	}

	remove(id: string | number): Promise<WriteConfirmation> {
		return addons.remove(id);
	}

	async update(id: string | number, addon: Addon): Promise<Addon> {
		await addons.set(id, addon);
		return addons.get(id);
	}
}
