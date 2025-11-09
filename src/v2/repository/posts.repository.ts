import { WriteConfirmation } from "firestorm-db";
import { posts } from "../firestorm";
import { CreateWebsitePost, WebsitePost, WebsitePosts } from "../interfaces";

export function getRaw(): Promise<Record<string, WebsitePost>> {
	return posts.readRaw();
}

export function getApproved(): Promise<WebsitePosts> {
	return posts.search([
		{
			field: "published",
			criteria: "==",
			value: true,
		},
	]);
}

export async function getAvailable(): Promise<string[]> {
	const approved = await getApproved();
	return approved.map((post) => post.permalink);
}

export function getById(id: number): Promise<WebsitePost> {
	return posts.get(id);
}

export async function getByPermalink(permalink: string): Promise<WebsitePost> {
	const results = await posts.search([
		{
			criteria: "==",
			field: "permalink",
			value: permalink,
		},
	]);
	return results[0];
}

export async function create(postToCreate: CreateWebsitePost): Promise<WebsitePost> {
	await posts.add(postToCreate);
	return getByPermalink(postToCreate.permalink);
}

export async function update(id: number, post: CreateWebsitePost): Promise<WebsitePost> {
	await posts.set(id, post);
	return posts.get(id);
}

export function remove(id: number): Promise<WriteConfirmation> {
	return posts.remove(id);
}
