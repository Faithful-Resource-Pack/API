import { ModChannel, ModPlatform } from "../../interfaces";

export interface PlatformProject {
	platform: ModPlatform;
	project_id: string;
	name: string;
	slug: string;
	summary?: string;
	icon?: string;
	license?: string;
	// set on search results found by an exact id, slug or project url
	exact?: boolean;
}

export interface PlatformFile {
	platform: ModPlatform;
	project_id: string;
	file_id: string;
	filename: string;
	// the version as written on the platform, shown when it couldn't be read as semver
	raw_version: string;
	// best guess at the mod version, null when it couldn't be read as semver
	version: string | null;
	minecraft: string[];
	loaders: string[];
	sha1?: string;
	// null when the platform doesn't expose a download url for this file
	download_url: string | null;
	channel: ModChannel;
	date: string;
}

export interface PlatformSearchResult {
	results: PlatformProject[];
	// platforms that couldn't be searched (ex: invalid api key), results from the others are still shown
	errors: string[];
}

export interface PlatformClient {
	search(query: string): Promise<PlatformProject[]>;
	/** Find a project by its exact id or slug, null if there's none */
	lookup(query: string): Promise<PlatformProject | null>;
	getProject(projectId: string): Promise<PlatformProject>;
	getFiles(projectId: string): Promise<PlatformFile[]>;
	getFile(projectId: string, fileId: string): Promise<PlatformFile>;
}
