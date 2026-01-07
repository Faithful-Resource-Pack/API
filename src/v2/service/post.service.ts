import { WriteConfirmation } from "firestorm-db";
import { PostDownload, PostChangelog, WebsitePost, CreateWebsitePost } from "../interfaces";
import { NotFoundError } from "../tools/errorTypes";
import PostFirestormRepository from "../repository/posts.repository";
import * as cache from "../tools/cache";

export default class PostService {
	private readonly repo = new PostFirestormRepository();

	async getByPermalink(permalink: string): Promise<WebsitePost> {
		try {
			return await this.repo.getByPermalink(permalink);
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
		return this.repo.getRaw();
	}

	async getById(id: number): Promise<WebsitePost> {
		try {
			return await this.repo.getById(id);
		} catch {
			// rethrow with our own information
			throw new NotFoundError("Post not found");
		}
	}

	getApprovedPosts(): Promise<WebsitePost[]> {
		return this.repo.getApproved();
	}

	getAvailablePosts(): Promise<string[]> {
		return this.repo.getAvailable();
	}

	async getTopPosts(count: number): Promise<WebsitePost[]> {
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
		const created = await this.repo.create(post);
		await cache.purge("available-posts");
		return created;
	}

	async update(id: number, post: CreateWebsitePost): Promise<WebsitePost> {
		const updated = await this.repo.update(id, post);
		await cache.purge("available-posts");
		return updated;
	}

	async remove(id: number): Promise<WriteConfirmation> {
		const removed = await this.repo.remove(id);
		await cache.purge("available-posts");
		return removed;
	}
}
