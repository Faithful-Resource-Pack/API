import { Request as ExRequest } from "express";
import {
	Controller,
	Get,
	Path,
	Request,
	Response,
	Route,
	Post,
	Security,
	SuccessResponse,
	Tags,
	Body,
	Put,
	Delete,
	Query,
} from "tsoa";
import DOMPurify from "isomorphic-dompurify";
import { WriteConfirmation } from "firestorm-db";
import {
	PostDownload,
	PostChangelog,
	WebsitePost,
	CreateWebsitePost,
	WebsitePosts,
} from "../interfaces";

import { BadRequestError, NotFoundError, PermissionError } from "../tools/errors";
import * as cache from "../tools/cache";
import PostService from "../service/post.service";

@Route("posts")
@Tags("Posts")
export class PostController extends Controller {
	private readonly service = new PostService();

	/**
	 * Get the raw collection
	 */
	@Response<PermissionError>(403)
	@Response<NotFoundError>(404)
	@Security("discord", ["administrator"])
	@Security("bot")
	@Get("raw")
	public getRaw(): Promise<Record<string, WebsitePost>> {
		return this.service.getRaw();
	}

	/**
	 * Get the latest posts
	 * @param count Number of posts to get (default 6)
	 * @returns Latest posts
	 */
	@Get("top")
	public getTopPosts(@Query() count = 6): Promise<WebsitePosts> {
		return this.service.getTopPosts(count);
	}

	/**
	 * Get any post by ID, status, or permalink (needs to be authenticated for non-approved post)
	 * Note: slugs with slashes need to be escaped (/ -> %2F)
	 * @param id_or_slug Desired post permalink
	 * @example Slug "/faithful64x/B4"
	 */
	@Response<NotFoundError>(404)
	@Security("discord", ["post:approved", "administrator"])
	@Get("{id_or_slug}")
	public getPostByPermalink(@Path() id_or_slug: string): Promise<WebsitePost | WebsitePosts> {
		if (id_or_slug === "approved") return this.service.getApprovedPosts();
		return this.service.getByIdOrPermalink(id_or_slug);
	}

	/**
	 * Get a redirect URL for the requested post header
	 * @param id Requested post ID
	 */
	@Response<NotFoundError>(404)
	@Get("{id}/header")
	@SuccessResponse(302, "Redirect")
	public async getHeaderForPost(@Path() id: number, @Request() request: ExRequest): Promise<void> {
		const { header_img } = await this.service.getById(id);
		if (!header_img) throw new NotFoundError("Post header image not found");

		request.res.redirect(302, header_img);
	}

	/**
	 * Get the possible downloads for the given post
	 * @param id ID of the requested post
	 */
	@Response<NotFoundError>(404)
	@Get("{id}/downloads")
	public getPostDownloads(@Path() id: number): Promise<PostDownload | null> {
		return cache.handle(`website-post-downloads-${id}`, () => this.service.getDownloadsForId(id));
	}

	/**
	 * Get the possible changelog for the given post
	 * @param id ID of the requested post
	 */
	@Response<NotFoundError>(404)
	@Get("{id}/changelog")
	public getPostChangelog(@Path() id: number): Promise<PostChangelog | null> {
		return this.service.getChangelogForId(id);
	}

	/**
	 * Creates post and returns the created post
	 * @param postToCreate Post information
	 */
	@Response<BadRequestError>(400)
	@Response<PermissionError>(403)
	@Security("discord", ["administrator"])
	@Post("")
	public createPost(@Body() postToCreate: CreateWebsitePost): Promise<WebsitePost> {
		// sanitize from the start
		postToCreate.description = DOMPurify.sanitize(postToCreate.description);
		return this.service.create(postToCreate);
	}

	/**
	 * Updates the post to the given ID
	 * @param id Post ID
	 * @param postToUpdate Post information
	 */
	@Response<BadRequestError>(400)
	@Response<PermissionError>(403)
	@Security("discord", ["administrator"])
	@Put("{id}")
	public updatePost(
		@Path() id: number,
		@Body() postToUpdate: CreateWebsitePost,
	): Promise<WebsitePost> {
		postToUpdate.description = DOMPurify.sanitize(postToUpdate.description);
		return this.service.update(id, postToUpdate);
	}

	/**
	 * Deletes the post with the given ID
	 * @param id Post ID
	 */
	@Response<BadRequestError>(400)
	@Response<PermissionError>(403)
	@Security("discord", ["administrator"])
	@Delete("{id}")
	public deletePost(@Path() id: number): Promise<WriteConfirmation> {
		return this.service.remove(id);
	}
}
