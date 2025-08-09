import { WriteConfirmation } from "firestorm-db";
import SettingsFirestormRepository from "../repository/settings.repository";

export default class SettingsService {
	private readonly settingsRepository = new SettingsFirestormRepository();

	raw(): Promise<Record<string, any>> {
		return this.settingsRepository.getRaw();
	}

	async get(keys: string[]): Promise<any> {
		const raw = await this.raw();
		return keys.reduce<Record<string, any>>((acc, cur) => acc[cur], raw);
	}

	update(body: Record<string, any>): Promise<WriteConfirmation> {
		return this.settingsRepository.update(body);
	}
}
