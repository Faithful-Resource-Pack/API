import { WriteConfirmation } from "firestorm-db";

export interface SettingsRepository {
	getRaw(): Promise<Record<string, unknown>>;
	update(body: Record<string, any>): Promise<WriteConfirmation>;
}
