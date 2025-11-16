import { WriteConfirmation } from "firestorm-db";
import * as SettingsRepo from "../repository/settings.repository";

export default class SettingsService {
	raw(): Promise<Record<string, unknown>> {
		return SettingsRepo.getRaw();
	}

	async get(keys: string[]): Promise<unknown> {
		const raw = await this.raw();
		return keys.reduce((acc, cur) => acc[cur], raw);
	}

	update(body: Record<string, unknown>): Promise<WriteConfirmation> {
		return SettingsRepo.update(body);
	}
}
