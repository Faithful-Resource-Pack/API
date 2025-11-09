import { WriteConfirmation } from "firestorm-db";
import { addons, files } from "../firestorm";
import { Files, AddonStatus, Addon, Addons, CreationAddon } from "../interfaces";

export function getRaw(): Promise<Record<string, Addon>> {
	return addons.readRaw();
}

export function getAddonById(id: number): Promise<Addon> {
	return addons.get(id);
}

export async function getFilesById(addonId: string | number): Promise<Files> {
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

export function getAddonByStatus(status: AddonStatus): Promise<Addons> {
	return addons.search([
		{
			criteria: "==",
			field: "approval.status",
			value: status,
		},
	]);
}

export async function getAddonBySlug(slug: string): Promise<Addon | undefined> {
	const results = await addons.search([
		{
			criteria: "==",
			field: "slug",
			value: slug,
		},
	]);
	return results[0];
}

export async function create(addon: CreationAddon): Promise<Addon> {
	const id = await addons.add(addon);
	return addons.get(id);
}

export function remove(id: string | number): Promise<WriteConfirmation> {
	return addons.remove(id);
}

export async function update(id: string | number, addon: Addon): Promise<Addon> {
	await addons.set(id, addon);
	return addons.get(id);
}
