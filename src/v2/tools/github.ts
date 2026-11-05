import axios, { AxiosError } from "axios";
import { APIError } from "./errorTypes";
import { mapLimit } from "./queue";

const api = axios.create({
	baseURL: process.env.GITHUB_API_URL || "https://api.github.com",
	headers: {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	},
	timeout: 30000,
});

api.interceptors.request.use((config) => {
	const token = process.env.GITHUB_TOKEN;
	if (!token) throw new APIError("GitHubNotConfigured", 503, "No GitHub token is configured");
	config.headers.Authorization = `Bearer ${token}`;
	return config;
});

export interface RepoFileChange {
	path: string;
	// null removes the file
	content: Buffer | null;
}

// pack holding the original textures of the mods, in the same layout as the packs with contributions
export const DEFAULT_PACK = "default";

/** Public url of a file of a repository at a ref (branch or commit) */
export const rawFileURL = (org: string, repo: string, ref: string, path: string) =>
	`https://raw.githubusercontent.com/${org}/${repo}/${[ref, ...path.split("/")].map(encodeURIComponent).join("/")}`;

// git knows this tree without it being created
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

const BLOB_CONCURRENCY = 8;
// above this size the files don't go in one graphql request, they are uploaded one by one instead
const GRAPHQL_MAX_BYTES = 20 * 1024 * 1024;

const isStatus = (err: unknown, ...statuses: number[]) =>
	err instanceof AxiosError && statuses.includes(err.response?.status ?? 0);

/** Turn a GitHub failure into an error that tells what was being done */
async function call<T>(action: string, request: Promise<{ data: T }>): Promise<T> {
	try {
		return (await request).data;
	} catch (err) {
		if (isStatus(err, 404)) throw err;
		const message = (err as AxiosError<{ message?: string }>).response?.data?.message;
		throw new APIError(
			"GitHubError",
			502,
			`GitHub failed to ${action}${message ? `: ${message}` : ""}`,
		);
	}
}

/** Commit sha at the head of a branch, null if the branch doesn't exist */
async function getBranchSha(org: string, repo: string, branch: string): Promise<string | null> {
	try {
		const ref = await call<{ object: { sha: string } }>(
			"read a branch",
			api.get(`/repos/${org}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`),
		);
		return ref.object.sha;
	} catch (err) {
		// GitHub answers 409 for a repository without any commit
		if (isStatus(err, 404, 409)) return null;
		throw err;
	}
}

/**
 * Give an empty repository its first commit, the git data api refuses to write to one.
 * The contents api can, and creates the default branch with it.
 */
async function initRepo(org: string, repo: string): Promise<void> {
	await call(
		"initialize a repository",
		api.put(`/repos/${org}/${repo}/contents/README.md`, {
			message: "Initialize repository",
			content: Buffer.from(`# ${repo}\n`).toString("base64"),
		}),
	);
}

/** Whether a repository has no commit at all */
async function isEmptyRepo(org: string, repo: string): Promise<boolean> {
	try {
		await call(
			"list commits",
			api.get(`/repos/${org}/${repo}/commits`, { params: { per_page: 1 } }),
		);
		return false;
	} catch (err) {
		if (isStatus(err, 409)) return true;
		throw err;
	}
}

/**
 * Create a branch with an empty root commit if it doesn't exist yet, so mod branches share no history
 * @returns whether the branch had to be created
 */
export async function ensureBranch(org: string, repo: string, branch: string): Promise<boolean> {
	if (await getBranchSha(org, repo, branch)) return false;
	if (await isEmptyRepo(org, repo)) await initRepo(org, repo);

	const base = `/repos/${org}/${repo}`;
	const commit = await call<{ sha: string }>(
		"create a commit",
		api.post(`${base}/git/commits`, { message: `Create ${branch}`, tree: EMPTY_TREE, parents: [] }),
	);
	await call(
		"create a branch",
		api.post(`${base}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha }),
	);
	return true;
}

/**
 * Read a file of a repository at a ref (branch or commit)
 * @returns the content, null if the file doesn't exist there
 */
export async function getFileContent(
	org: string,
	repo: string,
	ref: string,
	path: string,
): Promise<Buffer | null> {
	try {
		const res = await call<ArrayBuffer>(
			"read a file",
			api.get(
				`/repos/${org}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`,
				{
					params: { ref },
					headers: { Accept: "application/vnd.github.raw+json" },
					responseType: "arraybuffer",
				},
			),
		);
		return Buffer.from(res);
	} catch (err) {
		if (isStatus(err, 404)) return null;
		throw err;
	}
}

interface PullRequest {
	number: number;
	merged: boolean;
	base: string; // branch the pull request was merged into
	author: string; // github login
	mergeCommit: string | null;
	mergedAt: number | null;
}

interface PullRequestFile {
	path: string;
	status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
}

export interface PullRequestCommit {
	author: string | null; // github login, null when the commit email isn't linked to an account
	message: string;
}

export async function getPullRequest(org: string, repo: string, pr: number): Promise<PullRequest> {
	const data = await call<{
		number: number;
		merged: boolean;
		merge_commit_sha: string | null;
		merged_at: string | null;
		base: { ref: string };
		user: { login: string };
	}>("read a pull request", api.get(`/repos/${org}/${repo}/pulls/${pr}`));
	return {
		number: data.number,
		merged: data.merged,
		base: data.base.ref,
		author: data.user.login,
		mergeCommit: data.merge_commit_sha,
		mergedAt: data.merged_at ? Date.parse(data.merged_at) : null,
	};
}

/** Go through every page of a list endpoint */
async function paginate<T>(action: string, url: string): Promise<T[]> {
	const items: T[] = [];
	for (let page = 1; ; page++) {
		const batch = await call<T[]>(action, api.get(url, { params: { per_page: 100, page } }));
		items.push(...batch);
		if (batch.length < 100) return items;
	}
}

export async function getPullRequestFiles(
	org: string,
	repo: string,
	pr: number,
): Promise<PullRequestFile[]> {
	const files = await paginate<{ filename: string; status: PullRequestFile["status"] }>(
		"list the files of a pull request",
		`/repos/${org}/${repo}/pulls/${pr}/files`,
	);
	return files.map((f) => ({ path: f.filename, status: f.status }));
}

export async function getPullRequestCommits(
	org: string,
	repo: string,
	pr: number,
): Promise<PullRequestCommit[]> {
	const commits = await paginate<{ author: { login: string } | null; commit: { message: string } }>(
		"list the commits of a pull request",
		`/repos/${org}/${repo}/pulls/${pr}/commits`,
	);
	return commits.map((c) => ({ author: c.author?.login ?? null, message: c.commit.message }));
}

/**
 * Apply file changes to a branch as a single commit
 * @returns the sha of the new commit
 */
export async function commitFiles(
	org: string,
	repo: string,
	branch: string,
	changes: RepoFileChange[],
	message: string,
): Promise<string> {
	const headSha = await getBranchSha(org, repo, branch);
	if (!headSha)
		throw new APIError("GitHubError", 502, `GitHub has no branch "${branch}" in ${repo}`);

	const size = changes.reduce((total, c) => total + (c.content?.length ?? 0), 0);
	return size <= GRAPHQL_MAX_BYTES
		? commitWithGraphQL(org, repo, branch, headSha, changes, message)
		: commitWithGitData(org, repo, branch, headSha, changes, message);
}

/** Every file goes in one request, whatever their number */
async function commitWithGraphQL(
	org: string,
	repo: string,
	branch: string,
	headSha: string,
	changes: RepoFileChange[],
	message: string,
): Promise<string> {
	const data = await call<{
		data?: { createCommitOnBranch: { commit: { oid: string } } };
		errors?: { message: string }[];
	}>(
		"create a commit",
		api.post("/graphql", {
			query: `mutation ($input: CreateCommitOnBranchInput!) {
				createCommitOnBranch(input: $input) { commit { oid } }
			}`,
			variables: {
				input: {
					branch: { repositoryNameWithOwner: `${org}/${repo}`, branchName: branch },
					message: { headline: message },
					expectedHeadOid: headSha,
					fileChanges: {
						additions: changes
							.filter((c) => c.content)
							.map((c) => ({ path: c.path, contents: (c.content as Buffer).toString("base64") })),
						deletions: changes.filter((c) => !c.content).map((c) => ({ path: c.path })),
					},
				},
			},
		}),
	);

	// graphql reports failures in a successful response
	const oid = data.data?.createCommitOnBranch.commit.oid;
	if (!oid)
		throw new APIError(
			"GitHubError",
			502,
			`GitHub failed to create a commit: ${data.errors?.map((e) => e.message).join(", ")}`,
		);
	return oid;
}

/** Too big for one request: upload the files first, then build the commit from them */
async function commitWithGitData(
	org: string,
	repo: string,
	branch: string,
	headSha: string,
	changes: RepoFileChange[],
	message: string,
): Promise<string> {
	const base = `/repos/${org}/${repo}`;
	const head = await call<{ tree: { sha: string } }>(
		"read a commit",
		api.get(`${base}/git/commits/${headSha}`),
	);

	// a few at a time, a mod can have thousands of textures
	const tree: { path: string; mode: string; type: string; sha: string | null }[] = [];
	await mapLimit(changes, BLOB_CONCURRENCY, async ({ path, content }) => {
		if (!content) return void tree.push({ path, mode: "100644", type: "blob", sha: null });
		const blob = await call<{ sha: string }>(
			"upload a file",
			api.post(`${base}/git/blobs`, { content: content.toString("base64"), encoding: "base64" }),
		);
		tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
	});

	const newTree = await call<{ sha: string }>(
		"create a tree",
		api.post(`${base}/git/trees`, { base_tree: head.tree.sha, tree }),
	);
	const commit = await call<{ sha: string }>(
		"create a commit",
		api.post(`${base}/git/commits`, { message, tree: newTree.sha, parents: [headSha] }),
	);
	await call(
		"update a branch",
		api.patch(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha }),
	);
	return commit.sha;
}
