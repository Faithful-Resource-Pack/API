import { Request as ExRequest } from "express";
import {
	Controller,
	Get,
	Path,
	Request,
	Response,
	Route,
	Security,
	SuccessResponse,
	Tags,
} from "tsoa";
import {
	Addon,
	Addons,
	Files,
	AddonProperty,
	AddonDownload,
	AddonStatus,
	AddonStatusValues,
	AddonStats,
	AddonStatsAdmin,
	UserProfile,
} from "../interfaces";

import AddonService from "../service/addon.service";
import { NotAvailableError, NotFoundError, PermissionError } from "../tools/errorTypes";
import * as cache from "../tools/cache";

@Route("addons")
@Tags("Add-ons")
export class AddonController extends Controller {
	private readonly service = new AddonService();

	/**
	 * Get all add-ons in the collection
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["administrator"])
	@Security("bot")
	@Get("raw")
	public getRaw(): Promise<Record<string, Addon>> {
		return this.service.getRaw();
	}

	/**
	 * Get all public add-on statistics
	 */
	@Response<NotAvailableError>(408)
	@Get("stats")
	public getStats(): Promise<AddonStats> {
		return cache.handle("addon-stats", () => this.service.getStats(false));
	}

	/**
	 * Get all public and admin-only add-on statistics
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["administrator"])
	@Get("stats-admin")
	public getStatsAdmin(): Promise<AddonStatsAdmin> {
		return cache.handle("addon-stats-admin", () => this.service.getStats(true));
	}

	/**
	 * Get any add-on by ID, status, or slug (needs to be authenticated for non-approved add-on)
	 * @param id_or_slug Requested add-on ID, slug, or status
	 */
	@Response<PermissionError>(403)
	@Security("discord", ["addon:approved", "administrator"])
	@Get("{id_or_slug}")
	public async getAddon(@Path() id_or_slug: string | AddonStatus): Promise<Addon | Addons> {
		if (AddonStatusValues.includes(id_or_slug as AddonStatus))
			return this.service.getAddonsByStatus(id_or_slug as AddonStatus);
		const [, addon] = await this.service.getAddonFromSlugOrId(id_or_slug);
		return addon;
	}

	/**
	 * Get a redirect URL for the requested add-on header
	 * @param id_or_slug ID or slug of the requested add-on
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["addon:approved", "administrator"])
	@Get("{id_or_slug}/header")
	@SuccessResponse(302, "Redirect")
	public async getHeaderFile(
		@Path() id_or_slug: string,
		@Request() request: ExRequest,
	): Promise<void> {
		const [addonID] = await this.service.getAddonFromSlugOrId(id_or_slug);
		let headerFileURL = await this.service.getHeaderFileURL(addonID);
		if (headerFileURL.startsWith("/")) headerFileURL = process.env.DB_IMAGE_ROOT + headerFileURL;

		request.res.redirect(headerFileURL);
	}

	/**
	 * Get all author profiles for the given add-on
	 * @param id_or_slug ID or slug of the requested add-on
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["addon:approved", "administrator"])
	@Get("{id_or_slug}/authors")
	public getAddonAuthorsProfiles(@Path() id_or_slug: string): Promise<UserProfile[]> {
		return this.service.getAddonAuthorsProfiles(id_or_slug);
	}

	/**
	 * Get any add-on property by ID or slug
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["addon:approved", "administrator"])
	@Get("{id_or_slug}/{property}")
	public async getAddonPropertyById(
		@Path() id_or_slug: string,
		@Path() property: AddonProperty,
	): Promise<Addon | Files> {
		const [addonID] = await this.service.getAddonFromSlugOrId(id_or_slug);
		return this.service.getAddonProperty(addonID, property);
	}

	/**
	 * Get an array of URLs of all screenshots for the requested add-on
	 * @param id_or_slug ID or slug of the requested add-on
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["addon:approved", "administrator"])
	@Get("{id_or_slug}/files/screenshots")
	public async getScreenshots(@Path() id_or_slug: string): Promise<string[]> {
		const [addonID] = await this.service.getAddonFromSlugOrId(id_or_slug);
		const screens = await this.service.getScreenshots(addonID);
		return screens.map((s) => (s.startsWith("/") ? process.env.DB_IMAGE_ROOT + s : s));
	}

	/**
	 * Get an array of IDs of all screenshots for the requested add-on
	 * @param id_or_slug ID or slug of the requested add-on
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["addon:own", "administrator"])
	@Get("{id_or_slug}/files/screenshots-ids")
	public async getScreenshotsIds(@Path() id_or_slug: string): Promise<string[]> {
		const [addonID] = await this.service.getAddonFromSlugOrId(id_or_slug);
		return this.service.getScreenshotsIds(addonID);
	}

	/**
	 * Get an array of URLs of all screenshots for the requested add-on
	 * @param id_or_slug ID or slug of the requested add-on
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["addon:approved", "administrator"])
	@Get("{id_or_slug}/files/downloads")
	public async getDownloads(@Path() id_or_slug: string): Promise<AddonDownload[]> {
		const [addonID] = await this.service.getAddonFromSlugOrId(id_or_slug);
		const files = await this.service.getFiles(addonID);
		return Object.values(
			files
				.filter((f) => f.use === "download")
				.map((file) => {
					if (!file.source.startsWith("https://") && !file.source.startsWith("http://"))
						file.source = `http://${file.source}`;
					return file;
				})
				.reduce((acc, file) => {
					if (acc[file.name] === undefined) {
						acc[file.name] = {
							key: file.name,
							links: [],
						};
					}
					acc[file.name].links.push(file.source);
					return acc;
				}, {}),
		);
	}

	/**
	 * Get a redirect URL for the requested screenshot
	 * @param id_or_slug ID or slug of the requested add-on
	 * @param index Screenshot index, starts at 0
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["addon:approved", "administrator"])
	@Get("{id_or_slug}/files/screenshots/{index}")
	@SuccessResponse(302, "Redirect")
	public async getScreenshot(
		@Path() id_or_slug: string,
		@Path() index: number,
		@Request() request: ExRequest,
	) {
		const [addonID] = await this.service.getAddonFromSlugOrId(id_or_slug);
		const screenshotURL = await this.service.getScreenshotURL(addonID, index);
		request.res.redirect(screenshotURL);
	}

	/**
	 * Get an add-on header image URL
	 * @param id_or_slug ID or slug of the requested add-on
	 * @returns Add-on header image URL
	 */
	@Response<NotFoundError>(404)
	@Response<PermissionError>(403)
	@Security("discord", ["addon:approved", "administrator"])
	@Get("{id_or_slug}/files/header")
	public async getHeaderURL(@Path() id_or_slug: string): Promise<string> {
		const [addonID] = await this.service.getAddonFromSlugOrId(id_or_slug);
		let headerFileURL = await this.service.getHeaderFileURL(addonID);
		if (headerFileURL.startsWith("/")) headerFileURL = process.env.DB_IMAGE_ROOT + headerFileURL;

		return headerFileURL;
	}
}
