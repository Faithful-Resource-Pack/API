import { WriteConfirmation } from "firestorm-db";
import { posts } from "../firestorm";
import { CreateWebsitePost, WebsitePost, WebsitePostRepository, WebsitePosts } from "../interfaces";

export default class PostFirestormRepository implements WebsitePostRepository {
	getRaw(): Promise<Record<string, WebsitePost>> {
		return posts.readRaw();
	}

	getApproved(): Promise<WebsitePosts> {
		return posts.search([
			{
				field: "published",
				criteria: "==",
				value: true,
			},
		]);
	}

	getById(id: number): Promise<WebsitePost> {
		return posts.get(id);
	}

	async getByPermalink(permalink: string): Promise<WebsitePost> {
		const results = await posts.search([
			{
				criteria: "==",
				field: "permalink",
				value: permalink,
			},
		]);
		return results[0];
	}

	async create(postToCreate: CreateWebsitePost): Promise<WebsitePost> {
		await posts.add(postToCreate);
		return this.getByPermalink(postToCreate.permalink);
	}

	async update(id: number, post: CreateWebsitePost): Promise<WebsitePost> {
		await posts.set(id, post);
		return posts.get(id);
	}

	remove(id: number): Promise<WriteConfirmation> {
		return posts.remove(id);
	}
}
