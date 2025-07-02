import { WriteConfirmation } from "firestorm-db";

export interface PostDownload {
	// for some reason index signatures work but records don't (???)
	[category: string]: Record<string, string> | string;
}

export interface PostChangelog {
	// recursive type (arbitrary nesting possible as long as it terminates with strings somewhere)
	[category: string]: PostChangelog | (string | PostChangelog)[];
}

export interface CreateWebsitePost {
	title: string; // Post main title
	permalink: string; // link to the post
	date: string; // date with format YYYY-MM-DD
	header_img?: string; // header image url
	description: string; // post HTML content
	published: boolean;
	discontinued?: true; // if false the key isn't included
	downloads?: PostDownload; // attached downloads
	changelog?: PostChangelog; // attached article changelog
}

export interface WebsitePost extends CreateWebsitePost {
	id: string;
}

export type WebsitePosts = WebsitePost[];

export interface FirestormPost extends WebsitePost {}

export interface WebsitePostRepository {
	getRaw(): Promise<Record<string, WebsitePost>>;
	getApproved(): Promise<WebsitePost[]>;
	getById(id: number): Promise<WebsitePost>;
	getByPermalink(permalink: string): Promise<WebsitePost>;
	create(post: CreateWebsitePost): Promise<WebsitePost>;
	update(id: number, post: CreateWebsitePost): Promise<WebsitePost>;
	remove(id: number): Promise<WriteConfirmation>;
}
