import { Body, Controller, Get, Path, Post, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import { NotFoundError, PermissionError } from "../tools/ApiError";
import { SettingsService } from "../service/settings.service";

@Route("settings")
@Tags("Settings")
export class SettingsController extends Controller {
	private readonly settingsService = new SettingsService();

	/**
	 * Get the raw collection
	 */
	@SuccessResponse(200)
	@Get("raw")
	public async getRaw(): Promise<any> {
		return this.settingsService.raw();
	}

	/**
	 * Gives particular setting from path
	 * @param path setting path split by "."
	 */
	@SuccessResponse(200)
	@Response<NotFoundError>(404)
	@Get("{path}")
	public async get(@Path() path: String): Promise<any> {
	  const splitPath = path.split(".");

	  const response = await this.settingsService.get(splitPath);

	  if (response === undefined) throw new NotFoundError(`No setting found for key '${path}'`);

	  return response;
	}

	/**
	 * Update the whole collection with the sent content
	 * @param body
	 */
	@SuccessResponse(204)
	@Response<PermissionError>(403)
	@Post("/raw")
	@Security("discord", ["administrator", "developer"])
	public async update(@Body() body: any): Promise<void> {
	  return this.settingsService.update(body);
	}
}
