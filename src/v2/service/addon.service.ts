import { URL } from "url";
import { APIEmbed, APIEmbedField } from "discord-api-types/v10";
import { WriteConfirmation } from "firestorm-db";
import { User, UserProfile } from "../interfaces/users";
import {
	Addons,
	Addon,
	AddonStatus,
	AddonAll,
	Files,
	File,
	FileParent,
	MulterFile,
	CreationFile,
	CreationFiles,
} from "../interfaces";
import { BadRequestError, NotFoundError } from "../tools/errorTypes";
import UserService from "./user.service";
import FileService from "./file.service";
import {
	AddonCreationParam,
	AddonDataParam,
	AddonProperty,
	AddonReview,
	AddonStats,
	AddonStatsAdmin,
	AddonStatusApproved,
} from "../interfaces/addons";
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

const ACCEPTED_IMAGE_TYPES = ["image/jpeg"];

export default class AddonService {
	private readonly userService = new UserService();

	private readonly fileService = new FileService();

	private readonly addonRepo = new AddonFirestormRepository();

	private validateImageType(mediaType: string) {
		if (!ACCEPTED_IMAGE_TYPES.includes(mediaType))
			throw new BadRequestError(
				`Incorrect MIME type for input file: got ${mediaType}, expected ${ACCEPTED_IMAGE_TYPES.join(" | ")}`,
			);
	}

	public async getIdFromPath(idOrSlug: string): Promise<[number, Addon | undefined]> {
		const intID = Number(idOrSlug);

		// if slug
		if (Number.isNaN(intID)) {
			const addon = await this.getAddonBySlug(idOrSlug);
			if (!addon) throw new NotFoundError(`Add-on ${idOrSlug} not found`);
			return [addon.id as number, addon];
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

	async getFiles(id: number): Promise<Files> {
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

	async getScreenshotsFiles(id: number): Promise<Files> {
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

	getAddonsByStatus(status: AddonStatus): Promise<Addons> {
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

		const addon: Addon = {
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
		const files: CreationFiles = downloads.flatMap((d) =>
			d.links.map((link) => ({
				name: d.key,
				use: "download",
				type: "url",
				parent: { type: "addons", id: String(addonCreated.id) },
				source: link,
			})),
		);

		await Promise.all(files.map((file) => this.fileService.addFile(file)));
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

		const files: CreationFiles = downloads.flatMap((d) =>
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

	public async postHeader(
		idOrSlug: string,
		filename: string,
		multerFile: MulterFile,
	): Promise<void | File> {
		this.validateImageType(multerFile.mimetype);
		const { buffer } = multerFile;

		const [addonID, addon] = await this.getAddonFromSlugOrId(idOrSlug);
		const { slug } = addon;

		const before = addon.approval?.status || null;
		// try to remove current header
		await this.deleteHeader(String(addonID)).catch(() => {});

		const extension = filename.split(".").pop();
		const uploadLocation = `/images/addons/${slug}/header.${extension}`;

		// reput pending addon
		addon.approval = {
			status: "pending",
			author: null,
			reason: null,
		};

		await this.saveUpdate(addonID, addon, before);

		// upload file
		await this.fileService.upload(uploadLocation, filename, buffer, true);

		const newFile: CreationFile = {
			name: "header",
			use: "header",
			parent: {
				id: String(addonID),
				type: "addons",
			},
			type: "url",
			source: uploadLocation,
		};

		// add file to db
		// returns file id
		const id = await this.fileService.addFile(newFile);
		return this.fileService.getFileById(id);
	}

	public async postScreenshot(
		idOrSlug: string,
		filename: string,
		multerFile: MulterFile,
	): Promise<void | File> {
		this.validateImageType(multerFile.mimetype);
		const { buffer } = multerFile;

		const [addonID, addon] = await this.getAddonFromSlugOrId(idOrSlug);
		const { slug } = addon;

		const before = addon.approval?.status || null;

		// new random name based on time and random part
		const newName = Date.now().toString(36) + Math.random().toString(36).slice(2);

		const extension = filename.split(".").pop();
		const uploadLocation = `/images/addons/${slug}/${newName}.${extension}`;

		// reput pending addon
		addon.approval = {
			status: "pending",
			author: null,
			reason: null,
		};
		await this.saveUpdate(addonID, addon, before);

		// upload file
		await this.fileService.upload(uploadLocation, filename, buffer, true);

		const newFile: CreationFile = {
			name: `screen${newName}`,
			use: "screenshot",
			parent: {
				id: String(addonID),
				type: "addons",
			},
			type: "url",
			source: uploadLocation,
		};

		// add file to db
		const id = await this.fileService.addFile(newFile);
		return this.fileService.getFileById(id);
	}

	public async remove(id: number): Promise<WriteConfirmation[]> {
		const parent: FileParent = {
			type: "addons",
			id: String(id),
		};

		const files = await this.getFiles(id);

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

	public async deleteScreenshot(
		idOrSlug: string,
		indexOrSlug: number | string,
	): Promise<WriteConfirmation> {
		const [addonID] = await this.getAddonFromSlugOrId(idOrSlug);

		// get existing screenshots
		const files = await this.getFiles(addonID).catch((): Files => []);
		const screens = files.filter((f) => f.use === "screenshot");

		// find precise screen, by id else by index
		const foundScreen = screens.find((s) => s.id && s.id === String(indexOrSlug));
		const screen: File = foundScreen || screens[indexOrSlug];
		if (screen === undefined) throw new NotFoundError("Screenshot not found");

		let { source } = screen;

		// delete eventual url beginning
		try {
			source = new URL(source).pathname;
		} catch {
			// don't worry it's not important, you tried
		}

		// remove file from file service
		await this.fileService.removeFileById(screen.id);

		// remove actual file
		return this.fileService.remove(source);
	}

	public async deleteHeader(idOrSlug: string): Promise<WriteConfirmation> {
		const [addonID, addon] = await this.getAddonFromSlugOrId(idOrSlug);

		const before = addon.approval.status || null;

		addon.approval = {
			reason: null,
			author: null,
			status: "pending",
		};

		// get existing screenshots
		const files = await this.getFiles(addonID).catch<Files>(() => []);
		const header = files.find((f) => f.use === "header");

		if (header === undefined) throw new NotFoundError("Header not found");

		let { source } = header;

		// delete eventual url beginning
		try {
			source = new URL(source).pathname;
		} catch {
			// don't worry it's not important, you tried
		}

		// reput pending addon
		addon.approval = {
			status: "denied",
			author: null,
			reason: "Add-on must have a header image",
		};
		await this.saveUpdate(addonID, addon, before, false);

		// remove file from file service
		await this.fileService.removeFileById(header.id);

		// remove actual file
		return this.fileService.remove(source);
	}

	private async saveUpdate(
		id: number,
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
			url: `https://webapp.faithfulpack.net/review/addons?status=${status}&id=${addon.id}`,
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

	public async getAddonProperty(id: number, property: AddonProperty): Promise<Addon | Files> {
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
