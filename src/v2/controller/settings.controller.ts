import {
	Body,
	Controller,
	Get,
	Path,
	Post,
	Response,
	Route,
	Security,
	SuccessResponse,
	Tags,
} from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import { NotFoundError, PermissionError } from "../tools/errorTypes";
import SettingsService from "../service/settings.service";
import * as cache from "../tools/cache";

@Route("settings")
@Tags("Settings")
export class SettingsController extends Controller {
	private readonly settingsService = new SettingsService();

	/**
	 * Get all settings in the collection
	 */
	@SuccessResponse(200)
	@Get("raw")
	public getRaw(): Promise<Record<string, unknown>> {
		return cache.handle("settings-raw", () => this.settingsService.raw());
	}

	/**
	 * Get particular setting from path
	 * @param path Settings path split by "."
	 */
	@SuccessResponse(200)
	@Response<NotFoundError>(404)
	@Get("{path}")
	public async get(@Path() path: string): Promise<unknown> {
		const splitPath = path.split(".");

		const response = await this.settingsService.get(splitPath);
		if (response === undefined) throw new NotFoundError(`No setting found for key '${path}'`);
		return response;
	}

	/**
	 * Update the whole collection with the sent content
	 * @param body Entire settings JSON
	 */
	@SuccessResponse(204)
	@Response<PermissionError>(403)
	@Post("/raw")
	@Security("discord", ["Administrator"])
	public async update(@Body() body: Record<string, unknown>): Promise<WriteConfirmation> {
		await cache.purge(/settings-raw/g);
		return this.settingsService.update(body);
	}
}
