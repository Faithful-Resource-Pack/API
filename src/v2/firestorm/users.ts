import firestorm from "firestorm-db";
import { Addon, Contribution, FirestormUser } from "../interfaces";
import { contributions } from ".";
import { addons } from "./addons";
import "./config";

export const users = firestorm.collection<FirestormUser>("users", (el) => {
	el.contributions = (): Promise<Contribution[]> =>
		contributions.search([
			{
				field: "authors",
				criteria: "array-contains",
				value: el[firestorm.ID_FIELD],
			},
		]);

	el.addons = (): Promise<Addon[]> =>
		addons.search([
			{
				field: "authors",
				criteria: "array-contains",
				value: el[firestorm.ID_FIELD],
			},
		]);

	return el;
});
