import { APIEmbed } from "discord-api-types/v10";
import { WriteConfirmation } from "firestorm-db";
import {
	Addon,
	AddonStatus,
	AddonAll,
	CreationFile,
	File,
	FileParent,
	UserProfile,
	AddonCreationParam,
	AddonDataParam,
	AddonProperty,
	AddonReview,
	AddonStats,
	AddonStatsAdmin,
	AddonStatusApproved,
	CreationAddon,
} from "../interfaces";
import { BadRequestError, NotFoundError } from "../tools/errorTypes";
import UserService from "./user.service";
import FileService from "./file.service";
import AddonFirestormRepository from "../repository/addon.repository";
import { discordEmbed } from "../tools/discordEmbed";

// filter & keep only values that are in a-z & 0-9 & _ or -
const toSlug = (value: string) =>
	value
		.toLowerCase()
		.replace(/ /g, "-")
		.split("")
		.filter((c) => /[a-z0-9_-]/.test(c))
		.join("");

export default class AddonService {
	private readonly userService = new UserService();
	private readonly fileService = new FileService();

	private readonly addonRepo = new AddonFirestormRepository();

	public async getIdFromPath(idOrSlug: string): Promise<[number, Addon | undefined]> {
		const intID = Number(idOrSlug);

		// if slug
		if (Number.isNaN(intID)) {
			const addon = await this.getAddonBySlug(idOrSlug);
			if (!addon) throw new NotFoundError(`Add-on ${idOrSlug} not found`);
			return [Number(addon.id), addon];
		}

		// else if id
		return [intID, undefined];
	}

	public async getAddonFromSlugOrId(idOrSlug: string): Promise<[number, Addon]> {
		const idAndAddon = await this.getIdFromPath(idOrSlug);
		const id = idAndAddon[0];
		const addon = idAndAddon[1] || (await this.getAddon(id));

		if (!addon) throw new NotFoundError(`Add-on ${idOrSlug} not found`);

		return [id, addon];
	}

	public async getApprovedAddonFromSlugOrId(idOrSlug: string): Promise<[number, Addon]> {
		const [id, addon] = await this.getAddonFromSlugOrId(idOrSlug);
		if (addon.approval.status === "approved") return [id, addon];

		throw new NotFoundError("This add-on is not publicly available");
	}

	getRaw(): Promise<Record<string, Addon>> {
		return this.addonRepo.getRaw();
	}

	async getAddon(id: number): Promise<Addon> {
		if (Number.isNaN(id) || id < 0) throw new Error("Add-on IDs are integers greater than 0");
		return this.addonRepo.getAddonById(id);
	}

	async getAddonAuthors(id: number): Promise<string[]> {
		const addon = await this.getAddon(id);
		return addon.authors;
	}

	async getAddonAuthorsProfiles(idOrSlug: string): Promise<UserProfile[]> {
		const [, addon] = await this.getAddonFromSlugOrId(idOrSlug);
		return this.userService.getUserProfiles(addon.authors);
	}

	async getFiles(id: number): Promise<File[]> {
		if (Number.isNaN(id) || id < 0) throw new Error("Add-on IDs are integers greater than 0");
		return this.addonRepo.getFilesById(id);
	}

	async getAll(id: number): Promise<AddonAll> {
		if (Number.isNaN(id) || id < 0) throw new Error("Add-on IDs are integers greater than 0");

		const results = await Promise.all([this.getAddon(id), this.getFiles(id)]);
		return { ...results[0], files: results[1] };
	}

	async getStats<IsAdmin extends boolean>(
		isAdmin: IsAdmin,
	): Promise<IsAdmin extends true ? AddonStatsAdmin : AddonStats> {
		const entries = await this.getRaw();

		// don't initialize non-approved addon keys if not admin
		const starter: Partial<AddonStatsAdmin> = isAdmin
			? { approved: 0, pending: 0, denied: 0, archived: 0 }
			: { approved: 0 };

		return Object.values(entries)
			.filter((a) => isAdmin || a.approval.status === AddonStatusApproved)
			.reduce(
				(acc, val) => {
					if (!val.approval.status) return acc;
					acc[val.approval.status]++;
					val.options.tags.forEach((t) => {
						acc.numbers[t] = (acc.numbers[t] || 0) + 1;
					});
					return acc;
				},
				{ ...starter, numbers: {} } as AddonStatsAdmin,
			);
	}

	async getScreenshotsFiles(id: number): Promise<File[]> {
		const files = await this.getFiles(id);
		return files.filter((f) => f.use === "screenshot");
	}

	async getScreenshotsIds(id: number): Promise<string[]> {
		const files = await this.getScreenshotsFiles(id);
		return Object.values(files).map((f) => f.id);
	}

	async getScreenshots(id: number): Promise<string[]> {
		const files = await this.getScreenshotsFiles(id);
		return Object.values(files).map((f) => f.source);
	}

	async getScreenshotURL(id: number, index: number): Promise<string> {
		const files = await this.getFiles(id);

		// if no files, not found
		if (files === undefined) throw new NotFoundError("Files not found");

		const screenshotFile = files.filter((f) => f.use === "screenshot")[index];

		// if no header file, not found
		if (screenshotFile === undefined) throw new NotFoundError("File not found");

		const src = screenshotFile.source;
		return src.startsWith("/") ? process.env.DB_IMAGE_ROOT + src : src;
	}

	async getHeaderFileURL(id: number): Promise<string> {
		const files = await this.getFiles(id);

		// if no files, not found
		if (files === undefined) throw new NotFoundError("Files not found");

		const headerFile = files.find((f) => f.use === "header");

		// if no header file, not found
		if (headerFile === undefined) throw new NotFoundError("File not found");

		return headerFile.source;
	}

	getAddonBySlug(slug: string): Promise<Addon | undefined> {
		return this.addonRepo.getAddonBySlug(slug);
	}

	getAddonsByStatus(status: AddonStatus): Promise<Addon[]> {
		return this.addonRepo.getAddonByStatus(status);
	}

	async create(body: AddonCreationParam): Promise<Addon> {
		// authentication already happened
		// tag values have already been verified

		// remove double authors
		body.authors = Array.from(new Set(body.authors));

		// remove trailing/leading spaces from addon name
		body.name = body.name.trim();

		// verify existing authors
		// return value not interesting
		const authors = await Promise.all(
			body.authors.map((authorID) => this.userService.getUserById(authorID)),
		).catch(() => {
			throw new BadRequestError("One author ID or more doesn't exist");
		});

		if (authors.some((author) => !author.username))
			throw new BadRequestError("All authors must have a username");

		// get the slug
		const slugValue = toSlug(body.name);

		// throw if already existing
		const existingAddon = await this.getAddonBySlug(slugValue);
		if (existingAddon) throw new BadRequestError(`Add-on slug /${slugValue} already exists`);

		const { downloads } = body;

		// typescript shenanigans to delete properties
		const addonDataParams: AddonDataParam & Partial<AddonCreationParam> = body;
		delete addonDataParams.downloads;

		const addon: CreationAddon = {
			...addonDataParams,
			last_updated: Date.now(),
			slug: slugValue,
			approval: {
				status: "pending",
				author: null,
				reason: null,
			},
		};

		const addonCreated = await this.addonRepo.create(addon);

		// one to many relationship
		const files = downloads.flatMap<CreationFile>((d) =>
			d.links.map((link) => ({
				name: d.key,
				use: "download",
				type: "url",
				parent: { type: "addons", id: String(addonCreated.id) },
				source: link,
			})),
		);

		await this.fileService.addFiles(files);
		// wait for all files to be added

		await this.notifyAddonChange(addonCreated, null).catch(console.error);
		return addonCreated;
	}

	async update(id: number, body: AddonCreationParam, reason: string): Promise<Addon> {
		// authentication already happened
		// tag values have already been verified

		// remove double authors
		body.authors = Array.from(new Set(body.authors));

		// remove trailing/leading spaces from addon name
		body.name = body.name.trim();

		// verify existing authors
		// return value not interesting
		const authors = await Promise.all(
			body.authors.map((authorID) => this.userService.getUserById(authorID)),
		).catch(() => {
			throw new BadRequestError("One author ID or more doesn't exist");
		});

		if (authors.some((author) => !author.username))
			throw new BadRequestError("All authors must have a username");

		const { downloads } = body;

		// typescript shenanigans to delete properties
		const addonDataParams: AddonDataParam & Partial<AddonCreationParam> = body;
		delete addonDataParams.downloads;

		const files = downloads.flatMap<CreationFile>((d) =>
			d.links.map((link) => ({
				name: d.key,
				use: "download",
				type: "url",
				parent: { type: "addons", id: String(id) },
				source: link,
			})),
		);

		await this.fileService
			.removeFilesByParentAndUse({ type: "addons", id: String(id) }, "download")
			.catch((err: string) => {
				throw new BadRequestError(err);
			});

		const savedAddon = await this.getAddon(id);
		const before = savedAddon.approval.status;
		const addon: Addon = {
			...savedAddon,
			...addonDataParams,
			last_updated: Date.now(),
			approval: {
				status: "pending",
				author: null,
				reason,
			},
		};

		// update addon, reupload download links
		const [results] = await Promise.all([
			this.saveUpdate(id, addon, before),
			this.fileService.addFiles(files),
		]);
		return results;
	}

	public async remove(id: string | number): Promise<WriteConfirmation[]> {
		const parent: FileParent = {
			type: "addons",
			id: String(id),
		};

		const files = await this.getFiles(Number(id));

		const realFiles = files
			.filter((f) => ["header", "screenshot"].includes(f.use))
			.map((f) => f.source.replace(/^http[s]?:\/\/.+?\//, ""))
			.map((s) => this.fileService.removeFileByPath(s));

		// remove addon
		// remove addon links
		// remove real files
		return Promise.all([
			this.addonRepo.remove(id),
			this.fileService.removeFilesByParent(parent),
			...realFiles,
		]);
	}

	async review(id: number, review: AddonReview): Promise<void> {
		const addon = await this.getAddon(id);
		const before = addon.approval?.status || null;
		addon.approval = review;
		this.saveUpdate(id, addon, before);
	}

	public async saveUpdate(
		id: string | number,
		addon: Addon,
		before: AddonStatus | null,
		notify = true,
	): Promise<Addon> {
		const a = await this.addonRepo.update(id, addon);
		if (notify) await this.notifyAddonChange(a, before).catch(console.error);
		return a;
	}

	private async notifyAddonChange(addon: Addon, before: AddonStatus | null): Promise<void> {
		const { status, author } = addon.approval;
		// webhook not set up or status hasn't changed
		if (!process.env.WEBHOOK_URL || before === status) return;

		let title: string;
		let name: string;
		if (status === "pending") {
			title = `${addon.name} is pending approval!`;
			name = "Add-on Update";
		} else {
			let username = "an unknown user";
			if (author) {
				const user = await this.userService.getUserById(author).catch(() => null);
				if (user) username = user.username;
			}

			title = `${addon.name} was ${status} by ${username}!`;
			name = "Add-on Review";
		}

		const embed: APIEmbed = {
			title,
			url: `https://webapp.faithfulpack.net/addons/review?status=${status}&id=${addon.id}`,
			author: {
				name,
				icon_url:
					"https://raw.githubusercontent.com/Faithful-Resource-Pack/Branding/main/role_icons/contributor/add_on_maker.png",
			},
		};

		if (status !== "approved")
			embed.fields = [
				{
					name: "Reason",
					value: addon.approval.reason ?? "*No reason provided*",
				},
			];

		discordEmbed(embed);
	}

	public async getAddonProperty(id: number, property: AddonProperty): Promise<Addon | File[]> {
		switch (property) {
			case "files": {
				const foundFiles = await this.getFiles(id);
				return foundFiles.map((f) => {
					if ((f.use === "header" || f.use === "screenshot") && f.source.startsWith("/"))
						f.source = process.env.DB_IMAGE_ROOT + f.source;

					if (
						f.use === "download" &&
						!f.source.startsWith("https://") &&
						!f.source.startsWith("http://")
					)
						f.source = `http://${f.source}`;

					return f;
				});
			}
			case "all":
			default: {
				const addon = await this.getAll(id);
				addon.files = addon.files.map((f) => {
					if ((f.use === "header" || f.use === "screenshot") && f.source.startsWith("/"))
						f.source = process.env.DB_IMAGE_ROOT + f.source;

					if (
						f.use === "download" &&
						!f.source.startsWith("https://") &&
						!f.source.startsWith("http://")
					)
						f.source = `http://${f.source}`;

					return f;
				});

				return addon;
			}
		}
	}
}
