import firestorm from "firestorm-db";
import { Contributions, Addons, FirestormUser } from "../interfaces";
import { contributions } from ".";
import { addons } from "./addons";
import "./config";

export const users = firestorm.collection<FirestormUser>("users", (el) => {
	el.contributions = (): Promise<Contributions> =>
		contributions.search([
			{
				field: "authors",
				criteria: "array-contains",
				value: el[firestorm.ID_FIELD],
			},
		]);

	el.addons = (): Promise<Addons> =>
		addons.search([
			{
				field: "authors",
				criteria: "array-contains",
				value: el[firestorm.ID_FIELD],
			},
		]);

	return el;
});
