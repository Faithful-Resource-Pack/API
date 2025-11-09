import { WriteConfirmation } from "firestorm-db";
import { settings } from "../firestorm/index";

export function getRaw(): Promise<Record<string, unknown>> {
	return settings.readRaw(true);
}

export function update(body: Record<string, any>): Promise<WriteConfirmation> {
	return settings.writeRaw(body);
}
