import { WriteConfirmation } from "firestorm-db";
import {
	PostDownload,
	PostChangelog,
	WebsitePost,
	CreateWebsitePost,
	WebsitePosts,
} from "../interfaces";
import { NotFoundError } from "../tools/errorTypes";
import * as PostRepo from "../repository/posts.repository";
import * as cache from "../tools/cache";

export default class PostService {
	async getByPermalink(permalink: string): Promise<WebsitePost> {
		try {
			return await PostRepo.getByPermalink(permalink);
		} catch {
			// rethrow with our own information
			throw new NotFoundError("Post not found");
		}
	}

	public async getByIdOrPermalink(idOrSlug: string): Promise<WebsitePost> {
		let postFound: WebsitePost | undefined;
		const parsed = Number(idOrSlug);

		if (!Number.isNaN(parsed)) postFound = await this.getById(parsed).catch(() => undefined);

		if (postFound === undefined)
			postFound = await this.getByPermalink(decodeURIComponent(idOrSlug)).catch(() => undefined);

		if (postFound !== undefined) return postFound;

		throw new NotFoundError("Post not found");
	}

	getRaw(): Promise<Record<string, WebsitePost>> {
		return PostRepo.getRaw();
	}

	async getById(id: number): Promise<WebsitePost> {
		try {
			return await PostRepo.getById(id);
		} catch {
			// rethrow with our own information
			throw new NotFoundError("Post not found");
		}
	}

	getApprovedPosts(): Promise<WebsitePosts> {
		return PostRepo.getApproved();
	}

	getAvailablePosts(): Promise<string[]> {
		return PostRepo.getAvailable();
	}

	async getTopPosts(count: number): Promise<WebsitePosts> {
		const allPosts = await this.getApprovedPosts();
		const sorted = allPosts.sort((a, b) => +new Date(b.date) - +new Date(a.date));
		return sorted.slice(0, count);
	}

	async getDownloadsForId(id: number): Promise<PostDownload | null> {
		const post = await this.getById(id);
		return post.downloads || null;
	}

	async getChangelogForId(id: number): Promise<PostChangelog | null> {
		const post = await this.getById(id);
		return post.changelog || null;
	}

	// must always invalidate cache after create/update/delete (prevents phantom posts)

	async create(post: CreateWebsitePost): Promise<WebsitePost> {
		const created = await PostRepo.create(post);
		await cache.purge("available-posts");
		return created;
	}

	async update(id: number, post: CreateWebsitePost): Promise<WebsitePost> {
		const updated = await PostRepo.update(id, post);
		await cache.purge("available-posts");
		return updated;
	}

	async remove(id: number): Promise<WriteConfirmation> {
		const removed = await PostRepo.remove(id);
		await cache.purge("available-posts");
		return removed;
	}
}
