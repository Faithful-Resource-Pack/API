import axios from "axios";
import { NotFoundError } from "../errorTypes";
import { isMinecraftVersion, parseVersion, versionFromFilename } from "../semver";
import { PlatformClient, PlatformFile, PlatformProject } from "./types";

const API = "https://api.modrinth.com/v2";

// modrinth requires an identifying user agent
const request = <T>(path: string, params?: Record<string, string | number>) =>
	axios
		.get<T>(`${API}${path}`, {
			params,
			headers: { "User-Agent": "Faithful-Resource-Pack/Faithful-API" },
		})
		.then((res) => res.data);

function toProject(project: any): PlatformProject {
	return {
		platform: "modrinth",
		// search hits use project_id, project endpoints use id
		project_id: project.project_id ?? project.id,
		name: project.title,
		slug: project.slug,
		summary: project.description,
		icon: project.icon_url || undefined,
		license: typeof project.license === "string" ? project.license : project.license?.id,
	};
}

function toFile(projectId: string, version: any): PlatformFile {
	const file = version.files.find((f: any) => f.primary) ?? version.files[0];
	const minecraft: string[] = (version.game_versions ?? []).filter(isMinecraftVersion);
	const name = String(version.version_number ?? "");
	return {
		platform: "modrinth",
		project_id: projectId,
		file_id: version.id,
		filename: file?.filename ?? "",
		raw_version: name || file?.filename || "",
		// version numbers are free text so fall back to reading the numbers out of them
		version:
			parseVersion(name, minecraft) ??
			versionFromFilename(name, minecraft) ??
			versionFromFilename(file?.filename ?? "", minecraft),
		minecraft,
		loaders: version.loaders ?? [],
		sha1: file?.hashes?.sha1,
		download_url: file?.url ?? null,
		channel: ["release", "beta", "alpha"].includes(version.version_type)
			? version.version_type
			: "release",
		date: version.date_published,
	};
}

export const modrinth: PlatformClient = {
	async search(query) {
		const res = await request<{ hits: any[] }>("/search", {
			query,
			facets: JSON.stringify([["project_type:mod"]]),
			limit: 20,
		});
		return res.hits.map(toProject);
	},

	async lookup(query) {
		// modrinth accepts both ids and slugs
		if (!/^[\w-]{3,64}$/.test(query)) return null;
		return this.getProject(query).catch(() => null);
	},

	async getProject(projectId) {
		const project = await request<any>(`/project/${projectId}`).catch(() => {
			throw new NotFoundError(`Modrinth project ${projectId} not found`);
		});
		return toProject(project);
	},

	async getFiles(projectId) {
		const versions = await request<any[]>(`/project/${projectId}/version`);
		return versions.filter((v) => v.files?.length).map((v) => toFile(projectId, v));
	},

	async getFile(projectId, fileId) {
		const version = await request<any>(`/version/${fileId}`).catch(() => {
			throw new NotFoundError(`Modrinth version ${fileId} not found`);
		});
		return toFile(projectId, version);
	},
};
