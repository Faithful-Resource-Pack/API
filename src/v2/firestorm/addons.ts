import firestorm from "firestorm-db";
import { FirestormAddon, AddonAll, File } from "../interfaces";
import { files } from "./files";
import "./config";

export const addons = firestorm.collection<FirestormAddon>("addons", (el) => {
	el.getFiles = (): Promise<File[]> =>
		files.search([
			{
				field: "parent.id",
				criteria: "==",
				value: el[firestorm.ID_FIELD],
			},
			{
				field: "parent.type",
				criteria: "==",
				value: "addons",
			},
		]);

	el.all = async (): Promise<AddonAll> => ({
		...el,
		files: await el.getFiles(),
	});

	return el;
});
