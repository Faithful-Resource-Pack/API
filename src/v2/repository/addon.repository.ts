import { WriteConfirmation } from "firestorm-db";
import { addons } from "../firestorm";
import { Files, AddonStatus, Addon, Addons, AddonRepository } from "../interfaces";

export default class AddonFirestormRepository implements AddonRepository {
	getRaw(): Promise<Record<string, Addon>> {
		return addons.readRaw();
	}

	getAddonById(id: number): Promise<Addon> {
		return addons.get(id);
	}

	async getFilesById(addonId: number): Promise<Files> {
		const addon = await addons.get(addonId);
		return addon.getFiles();
	}

	getAddonByStatus(status: AddonStatus): Promise<Addons> {
		return addons.search([
			{
				criteria: "==",
				field: "approval.status",
				value: status,
			},
		]);
	}

	async getAddonBySlug(slug: string): Promise<Addon> {
		const results = await addons.search([
			{
				criteria: "==",
				field: "slug",
				value: slug,
			},
		]);
		return results[0];
	}

	async create(addon: Addon): Promise<Addon> {
		await addons.add(addon);
		return this.getAddonBySlug(addon.slug);
	}

	delete(id: number): Promise<WriteConfirmation> {
		return addons.remove(String(id));
	}

	async update(id: number, addon: Addon): Promise<Addon> {
		await addons.set(id, addon);
		return addons.get(id);
	}
}
