import axios from "axios";
import { NotFoundError } from "../errorTypes";
import { MOD_LOADERS, isMinecraftVersion, parseVersion, versionFromFilename } from "../semver";
import { PlatformClient, PlatformFile, PlatformProject } from "./types";

const API = "https://api.curseforge.com/v1";
const MINECRAFT_GAME_ID = 432;
const MODS_CLASS_ID = 6;

const request = <T>(path: string, params?: Record<string, string | number>) =>
	axios
		.get<T>(`${API}${path}`, { params, headers: { "x-api-key": process.env.CURSEFORGE_API_KEY } })
		.then((res) => res.data);

function toProject(mod: any): PlatformProject {
	return {
		platform: "curseforge",
		project_id: String(mod.id),
		name: mod.name,
		slug: mod.slug,
		summary: mod.summary,
		icon: mod.logo?.thumbnailUrl || undefined,
	};
}

function toFile(projectId: string, file: any): PlatformFile {
	const gameVersions: string[] = file.gameVersions ?? [];
	const minecraft = gameVersions.filter(isMinecraftVersion);
	const sha1 = (file.hashes ?? []).find((h: any) => h.algo === 1)?.value;
	return {
		platform: "curseforge",
		project_id: projectId,
		file_id: String(file.id),
		filename: file.fileName,
		raw_version: String(file.displayName || file.fileName),
		version:
			parseVersion(String(file.displayName ?? ""), minecraft) ??
			versionFromFilename(file.fileName, minecraft),
		minecraft,
		loaders: gameVersions.map((v) => v.toLowerCase()).filter((v) => MOD_LOADERS.includes(v)),
		sha1,
		download_url: file.downloadUrl ?? null,
		channel:
			({ 1: "release", 2: "beta", 3: "alpha" } as const)[file.releaseType as 1 | 2 | 3] ??
			"release",
		date: file.fileDate,
	};
}

export const curseforge: PlatformClient = {
	async search(query) {
		const res = await request<{ data: any[] }>("/mods/search", {
			gameId: MINECRAFT_GAME_ID,
			classId: MODS_CLASS_ID,
			searchFilter: query,
			// the default order is far from relevant (exact names can be missing from the first page)
			sortField: 2, // popularity
			sortOrder: "desc",
			pageSize: 20,
		});
		return res.data.map(toProject);
	},

	async lookup(query) {
		if (/^\d+$/.test(query)) return this.getProject(query).catch(() => null);
		if (!/^[a-z0-9-]+$/i.test(query)) return null;
		const res = await request<{ data: any[] }>("/mods/search", {
			gameId: MINECRAFT_GAME_ID,
			classId: MODS_CLASS_ID,
			slug: query.toLowerCase(),
		});
		return res.data[0] ? toProject(res.data[0]) : null;
	},

	async getProject(projectId) {
		const res = await request<{ data: any }>(`/mods/${projectId}`).catch(() => {
			throw new NotFoundError(`CurseForge project ${projectId} not found`);
		});
		return toProject(res.data);
	},

	async getFiles(projectId) {
		const out: PlatformFile[] = [];
		const pageSize = 50;
		for (let index = 0; ; index += pageSize) {
			const res = await request<{ data: any[]; pagination: { totalCount: number } }>(
				`/mods/${projectId}/files`,
				{ pageSize, index },
			);
			out.push(...res.data.map((f) => toFile(projectId, f)));
			if (index + pageSize >= res.pagination.totalCount || !res.data.length) break;
		}
		return out;
	},

	async getFile(projectId, fileId) {
		const res = await request<{ data: any }>(`/mods/${projectId}/files/${fileId}`).catch(() => {
			throw new NotFoundError(`CurseForge file ${fileId} not found`);
		});
		return toFile(projectId, res.data);
	},
};
