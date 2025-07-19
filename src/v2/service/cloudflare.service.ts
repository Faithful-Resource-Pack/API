import Cloudflare from "cloudflare";
import { CachePurgeResponse } from "cloudflare/resources/cache/cache";
import { SettingEditResponse } from "cloudflare/resources/zones/settings";

const TOKEN = process.env.CLOUDFLARE_KEY;

export default class CloudflareService {
	private readonly cf = new Cloudflare({ apiToken: TOKEN });

	private async zoneIds(): Promise<string[]> {
		// permission needed: #zone:read
		const res = await this.cf.zones.list();
		return res.result.map((e) => e.id);
	}

	public async purge(): Promise<(CachePurgeResponse | null)[]> {
		const res = await this.cf.zones.list();
		// permission needed: #cache_purge:edit

		return Promise.all(
			res.result
				.map((e) => e.id)
				.map((id) =>
					this.cf.cache.purge({
						zone_id: id,
						purge_everything: true,
					}),
				),
		);
	}

	public async dev(mode: "on" | "off"): Promise<SettingEditResponse[]> {
		// permission needed: #zone_settings:edit
		const ids = await this.zoneIds();
		return Promise.all(
			ids.map((id) =>
				this.cf.zones.settings.edit("development_mode", {
					zone_id: id,
					value: mode,
				}),
			),
		);
	}
}
