import { WriteConfirmation } from "firestorm-db";
import * as SettingsFirestormRepository from "../repository/settings.repository";

export default class SettingsService {
	private readonly repo = SettingsFirestormRepository;

	raw(): Promise<Record<string, unknown>> {
		return this.repo.getRaw();
	}

	async get(keys: string[]): Promise<unknown> {
		const raw = await this.raw();
		return keys.reduce((acc, cur) => acc[cur], raw);
	}

	update(body: Record<string, unknown>): Promise<WriteConfirmation> {
		return this.repo.update(body);
	}
}
