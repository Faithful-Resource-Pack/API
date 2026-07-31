import { WriteConfirmation } from "firestorm-db";
import SettingsFirestormRepository from "../repository/settings.repository";

export default class SettingsService {
	private readonly settingsRepository = new SettingsFirestormRepository();

	getRaw(): Promise<Record<string, unknown>> {
		return this.settingsRepository.getRaw();
	}

	async get(keys: string[]): Promise<unknown> {
		const raw = await this.getRaw();
		return keys.reduce((acc, cur) => acc[cur], raw);
	}

	update(body: Record<string, unknown>): Promise<WriteConfirmation> {
		return this.settingsRepository.update(body);
	}
}
