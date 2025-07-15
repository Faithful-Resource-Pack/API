import {
	Body,
	Controller,
	Delete,
	Patch,
	Path,
	Post,
	Put,
	Request,
	Response,
	Route,
	Security,
	SuccessResponse,
	Tags,
} from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import { File, MulterFile } from "../interfaces/files";
import {
	AddonReview,
	Addon,
	AddonCreationParam,
	AddonReviewBody,
	AddonUpdateParam,
} from "../interfaces/addons";
import { PermissionError, BadRequestError } from "../tools/errorTypes";
import UserService from "../service/user.service";
import AddonService from "../service/addon.service";
import * as cache from "../tools/cache";
import { ExRequestWithAuth } from "../tools/authentication";

@Route("addons")
@Tags("Add-on Submissions")
export class AddonChangeController extends Controller {
	private readonly service = new AddonService();

	/**
	 * Create an add-on
	 * @param body Add-on data
	 */
	@Post("")
	@SuccessResponse(201, "Addon created")
	@Security("discord", [])
	public addonCreate(
		@Body() body: AddonCreationParam,
		@Request() request: ExRequestWithAuth<string>,
	): Promise<Addon> {
		if (!body.authors.includes(request.user))
			throw new BadRequestError("Addon author must include the authed user");
		return this.service.create(body);
	}

	/**
	 * Update an add-on
	 * @param id_or_slug ID or slug of the updated add-on
	 * @param body Add-on data
	 */
	@Response<PermissionError>(403)
	@Patch("{id_or_slug}")
	@SuccessResponse(204)
	@Security("discord", ["addon:own", "administrator"])
	public async addonUpdate(
		@Path() id_or_slug: string,
		@Body() body: AddonUpdateParam,
		@Request() request: ExRequestWithAuth<string>,
	): Promise<Addon> {
		const [id, addon] = await this.service.getAddonFromSlugOrId(id_or_slug);

		// if not an author wants to delete the addon
		if (!addon.authors.includes(request.user)) {
			// check if admin
			const user = await new UserService().getUserById(request.user);
			if (!user.roles.includes("Administrator"))
				throw new BadRequestError("Addon author must include the authed user");
		}

		return this.service.update(id, body, body.reason);
	}

	/**
	 * Set the review value of the add-on
	 * @param id_or_slug ID or slug of the reviewed add-on
	 * @param data Data containing, the status (pending, approved or denied) & the reason if denied (null otherwise)
	 */
	@Response<PermissionError>(403)
	@Put("{id_or_slug}/review")
	@SuccessResponse(204)
	@Security("discord", ["Administrator", "Moderator"])
	public async addonReview(
		@Path() id_or_slug: string,
		@Body() data: AddonReviewBody,
		@Request() request: ExRequestWithAuth<string>,
	): Promise<void> {
		const [addonID] = await this.service.getIdFromPath(id_or_slug);

		const review: AddonReview = {
			...data,
			author: String(request.user),
		};

		await this.service.review(addonID, review);

		// refresh add-on stats
		await cache.purge("addon-stats").catch(() => {});
	}

	/**
	 * Delete an add-on
	 * @param id_or_slug ID or slug of the deleted add-on
	 */
	@Response<PermissionError>(403)
	@Delete("{id_or_slug}")
	@SuccessResponse(204)
	@Security("discord", ["addon:own", "administrator"])
	public async addonDelete(@Path() id_or_slug: string): Promise<void> {
		const [addonID] = await this.service.getIdFromPath(id_or_slug);
		this.service.remove(addonID);
	}

	// no routes, exported to use with formHandler later

	/**
	 * Add or change a header image to an add-on
	 * @param id_or_slug Add-on to add header image to
	 * @param file File to post
	 */
	public postHeader(id_or_slug: string, file: MulterFile): Promise<File | void> {
		return this.service.postHeader(id_or_slug, file.originalname, file);
	}

	/**
	 * Add a screenshot to an add-on
	 * @param id_or_slug Add-on to add screenshot to
	 * @param file File to post
	 */
	public addonAddScreenshot(id_or_slug: string, file: MulterFile): Promise<File | void> {
		return this.service.postScreenshot(id_or_slug, file.originalname, file);
	}

	/**
	 * Delete an add-on screenshot
	 * @param id_or_slug ID or slug of the deleted add-on screenshot
	 * @param index Deleted add-on screenshot index
	 */
	@Response<PermissionError>(403)
	@Delete("{id_or_slug}/screenshots/{index_or_slug}")
	@SuccessResponse(204)
	@Security("discord", ["addon:own", "administrator"])
	public addonDeleteScreenshot(
		@Path() id_or_slug: string,
		@Path() index_or_slug: number | string,
	): Promise<WriteConfirmation> {
		return this.service.deleteScreenshot(id_or_slug, index_or_slug);
	}

	/**
	 * Delete an add-on screenshot
	 * @param id_or_slug ID or slug of the deleted add-on screenshot
	 * @param index Deleted add-on screenshot index
	 */
	@Response<PermissionError>(403)
	@Delete("{id_or_slug}/header/")
	@SuccessResponse(204)
	@Security("discord", ["addon:own", "administrator"])
	public addonDeleteHeader(@Path() id_or_slug: string): Promise<WriteConfirmation> {
		return this.service.deleteHeader(id_or_slug);
	}
}
