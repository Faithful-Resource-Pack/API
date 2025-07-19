import { Controller, Get, Path, Route, Security, Tags } from "tsoa";
import { CachePurgeResponse } from "cloudflare/resources/cache/cache";
import { SettingEditResponse } from "cloudflare/resources/zones/settings";
import CloudflareService from "../service/cloudflare.service";

@Route("cloudflare")
@Tags("Cloudflare")
export class CloudflareController extends Controller {
	private readonly service = new CloudflareService();

	/**
	 * Purge entire CloudFlare cache for faithfulpack.net, including its subdomains.
	 */
	@Get("purge")
	@Security("cloudflare")
	public purge(): Promise<(CachePurgeResponse | null)[]> {
		return this.service.purge();
	}

	/**
	 * Enables developer mode for three hours on faithfulpack.net, including its subdomains.
	 *
	 * Development Mode temporarily allows you to enter development mode for your websites if you need to make changes to your site.
	 * This will bypass Cloudflare's accelerated cache and slow down your site, but is useful if you are making changes to cacheable
	 * content (like images, css, or JavaScript) and would like to see those changes right away. Once entered, development mode will
	 * last for 3 hours and then automatically toggle off.
	 * @param mode Whether to enable or disable developer mode
	 */
	@Get("dev/{mode}")
	@Security("cloudflare")
	public dev(@Path() mode: "on" | "off"): Promise<SettingEditResponse[]> {
		return this.service.dev(mode);
	}
}
