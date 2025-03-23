import { WriteConfirmation } from "firestorm-db";
import {
	PostDownload,
	PostChangelog,
	WebsitePost,
	CreateWebsitePost,
	WebsitePosts,
} from "../interfaces";
import { NotFoundError } from "../tools/errors";
import PostFirestormRepository from "../repository/posts.repository";

export default class PostService {
	private readonly postRepo = new PostFirestormRepository();

	async getByPermalink(permalink: string): Promise<WebsitePost> {
		try {
			return await this.postRepo.getByPermalink(permalink);
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
		return this.postRepo.getRaw();
	}

	async getById(id: number): Promise<WebsitePost> {
		try {
			return await this.postRepo.getById(id);
		} catch {
			// rethrow with our own information
			throw new NotFoundError("Post not found");
		}
	}

	getApprovedPosts(): Promise<WebsitePosts> {
		return this.postRepo.getApproved();
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

	create(post: CreateWebsitePost): Promise<WebsitePost> {
		return this.postRepo.create(post);
	}

	update(id: number, post: CreateWebsitePost): Promise<WebsitePost> {
		return this.postRepo.update(id, post);
	}

	delete(id: number): Promise<WriteConfirmation> {
		return this.postRepo.delete(id);
	}
}
