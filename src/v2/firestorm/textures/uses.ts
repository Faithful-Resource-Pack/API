import firestorm from "firestorm-db";
import { FirestormUse, FirestormPath } from "../../interfaces";
import "../config";
import { paths } from "./paths";

export const uses = firestorm.collection<FirestormUse>("uses", (el) => {
	el.getPaths = (): Promise<FirestormPath[]> =>
		paths.search([
			{
				field: "use",
				criteria: "==",
				value: el[firestorm.ID_FIELD],
			},
		]);

	return el;
});
