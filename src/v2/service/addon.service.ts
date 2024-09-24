import { URL } from "url";
import { APIEmbedField } from "discord-api-types/v10";
import { WriteConfirmation } from "firestorm-db";
import { fileTypeFromBuffer, MimeType } from "file-type";
import { User, UserProfile } from "../interfaces/users";
import { Addons, Addon, AddonStatus, AddonAll, Files, File, FileParent } from "../interfaces";
import { BadRequestError, NotFoundError } from "../tools/errors";
import UserService from "./user.service";
import FileService from "./file.service";
import {
	AddonCreationParam,
	AddonDataParam,
	AddonReview,
	AddonStats,
	AddonStatsAdmin,
	AddonStatusApproved,
} from "../interfaces/addons";
import AddonFirestormRepository from "../repository/addon.repository";
import { discordEmbed } from "../tools/discordEmbed";

const HEADER_MIME_TYPES: MimeType[] = ["image/jpeg"];

const SCREENSHOT_MIME_TYPES: MimeType[] = ["image/jpeg"];

// filter & keep only values that are in a-Z & 0-9 & _ or -
const toSlug = (value: string) =>
	value
		.split("")
		.filter((c) => /[a-zA-Z0-9_-]/.test(c))
		.join("");

export default class AddonService {
	private readonly userService = new UserService();

	private readonly fileService = new FileService();

	private readonly addonRepo = new AddonFirestormRepository();

	/**
	 * Passes MIME type verification
	 * @param buffer Input file buffer
	 * @param mime_types_accepted List of accepted mime types
	 */
	private async verifyFileType(buffer: Buffer, mime_types_accepted: Array<MimeType>) {
		const { mime } = await fileTypeFromBuffer(buffer);
		if (!mime_types_accepted.includes(mime)) {
			throw new BadRequestError(
				`Incorrect file header, expected one in ${mime_types_accepted.toString()}, got ${mime}`,
			);
		}
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

	getAddon(id: number): Promise<Addon> {
		if (Number.isNaN(id) || id < 0)
			return Promise.reject(new Error("Add-on IDs are integers greater than 0"));
		return this.addonRepo.getAddonById(id);
	}

	async getAddonAuthors(id: number): Promise<Array<string>> {
		const addon = await this.getAddon(id);
		return addon.authors;
	}

	async getAddonAuthorsProfiles(idOrSlug: string): Promise<UserProfile[]> {
		const [, addon] = await this.getAddonFromSlugOrId(idOrSlug);
		return this.userService.getUserProfiles(addon.authors);
	}

	getFiles(id: number): Promise<Files> {
		if (Number.isNaN(id) || id < 0)
			return Promise.reject(new Error("Add-on IDs are integers greater than 0"));
		return this.addonRepo.getFilesById(id);
	}

	async getAll(id: number): Promise<AddonAll> {
		if (Number.isNaN(id) || id < 0)
			return Promise.reject(new Error("Add-on IDs are integers greater than 0"));

		const results = await Promise.all([this.getAddon(id), this.getFiles(id)]);
		return {
			...results[0],
			files: results[1],
		};
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
					acc[val.approval.status]++;
					val.options.tags.forEach((t) => {
						acc.numbers[t] = (acc.numbers[t] || 0) + 1;
					});
					return acc;
				},
				{
					...starter,
					numbers: {},
				} as AddonStatsAdmin,
			);
	}

	async getScreenshotsFiles(id: number): Promise<Files> {
		const files = await this.getFiles(id);
		// TODO: only keep screenshots
		return files.filter((f) => ["screenshot", "carousel"].includes(f.use));
	}

	async getScreenshotsIds(id: number): Promise<Array<string>> {
		const files = await this.getScreenshotsFiles(id);
		return Object.values(files).map((f) => f.id);
	}

	async getScreenshots(id: number): Promise<Array<string>> {
		const files = await this.getScreenshotsFiles(id);
		return Object.values(files).map((f) => f.source);
	}

	async getScreenshotURL(id: number, index: number): Promise<string> {
		const files = await this.getFiles(id);

		// if no files, not found
		if (files === undefined) {
			throw new NotFoundError("Files not found");
		}

		const screenshotFile = files.filter((f) => ["screenshot", "carousel"].includes(f.use))[index]; // TODO: only keep screenshots

		// if no header file, not found
		if (screenshotFile === undefined) {
			throw new NotFoundError("File not found");
		}

		const src = screenshotFile.source;
		const final = src.startsWith("/") ? process.env.DB_IMAGE_ROOT + src : src;

		return final;
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

	getAddonByStatus(status: AddonStatus): Promise<Addons> {
		return this.addonRepo.getAddonByStatus(status);
	}

	async create(body: AddonCreationParam): Promise<Addon> {
		// authentication was already made
		// tag values have already been verified

		// remove double authors
		body.authors = body.authors.filter((v, i, a) => a.indexOf(v) === i);

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
		if (existingAddon)
			throw new BadRequestError("The slug corresponding to this addon name already exists");

		const { downloads } = body;
		delete body.downloads;

		const addonDataParams = body as AddonDataParam;

		const addon: Addon = {
			...addonDataParams,
			last_updated: new Date().getTime(),
			slug: slugValue,
			approval: {
				status: "pending",
				author: null,
				reason: null,
			},
		};

		const addonCreated = await this.addonRepo.create(addon);

		const files: Files = [];
		downloads.forEach((d) => {
			d.links.forEach((link) => {
				files.push({
					name: d.key,
					use: "download",
					type: "url",
					parent: {
						type: "addons",
						id: String(addonCreated.id),
					},
					source: link,
				});
			});
		});

		await Promise.all(files.map((file) => this.fileService.addFile(file)));
		// wait for all files to be added

		await this.notifyAddonChange(addonCreated, null).catch(console.error);
		return addonCreated;
	}

	async update(id: number, body: AddonCreationParam, reason: string): Promise<Addon> {
		// authentication was already made
		// tag values have already been verified

		// remove double authors
		body.authors = body.authors.filter((v, i, a) => a.indexOf(v) === i);

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
		delete body.downloads;

		const files: Files = [];
		downloads.forEach((d) => {
			d.links.forEach((link) => {
				files.push({
					name: d.key,
					use: "download",
					type: "url",
					parent: {
						type: "addons",
						id: String(id),
					},
					source: link,
				});
			});
		});

		await this.fileService
			.removeFilesByParentAndUse(
				{
					type: "addons",
					id: String(id),
				},
				"download",
			)
			.catch((err) => {
				throw new BadRequestError(err);
			});

		const addonDataParams: AddonDataParam = body;
		const savedAddon = await this.getAddon(id);
		const before = savedAddon.approval.status;
		const addon: Addon = {
			...savedAddon,
			...addonDataParams,
			last_updated: new Date().getTime(),
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
		buffer: Buffer,
	): Promise<void | File> {
		this.verifyFileType(buffer, HEADER_MIME_TYPES);

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

		const newFile: File = {
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
		newFile.id = await this.fileService.addFile(newFile);

		return newFile;
	}

	public async postScreenshot(
		idOrSlug: string,
		filename: string,
		buffer: Buffer,
	): Promise<void | File> {
		this.verifyFileType(buffer, SCREENSHOT_MIME_TYPES);

		const [addonID, addon] = await this.getAddonFromSlugOrId(idOrSlug);
		const { slug } = addon;

		const before = addon.approval?.status || null;

		// new random name based on time and random part
		const newName = new Date().getTime().toString(36) + Math.random().toString(36).slice(2);

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

		const newFile: File = {
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
		newFile.id = await this.fileService.addFile(newFile);

		return newFile;
	}

	public async delete(id: number): Promise<void> {
		const parent: FileParent = {
			type: "addons",
			id: String(id),
		};

		const files = await this.getFiles(id);

		const realFiles = files
			.filter((f) => f.use === "carousel" || f.use === "header" || f.use === "screenshot")
			.map((f) => f.source.replace(/^http[s]?:\/\/.+?\//, ""))
			.map((s) => this.fileService.removeFileByPath(s));

		// remove addon
		// remove addon links
		// remove real files
		const deletePromises = [
			this.addonRepo.delete(id),
			this.fileService.removeFilesByParent(parent),
			...realFiles,
		];

		await Promise.allSettled(deletePromises);
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
		const screens = files.filter((f) => ["screenshot", "carousel"].includes(f.use));

		// find precise screen, by id else by index
		const idedscreen = screens.find((s) => s.id && s.id === String(indexOrSlug));
		const screen = idedscreen || screens[indexOrSlug];
		if (screen === undefined) return Promise.reject(new NotFoundError("Screenshot not found"));

		let { source } = screen;

		// delete eventual url beginning
		try {
			source = new URL(source).pathname;
		} catch (_error) {
			// don't worry it's not important, you tried
		}

		// remove file from file service
		await this.fileService.removeFileById(screen.id);

		// remove actual file
		return this.fileService.remove(source);
	}

	public async deleteHeader(idOrSlug: string): Promise<WriteConfirmation> {
		const [addonID, addon] = await this.getAddonFromSlugOrId(idOrSlug);

		const before = addon.approval?.status || null;

		addon.approval = {
			reason: null,
			author: null,
			status: "pending",
		};

		// get existing screenshots
		const files = await this.getFiles(addonID).catch((): Files => []);
		const header = files.filter((f) => f.use === "header")[0];

		if (header === undefined) return Promise.reject(new NotFoundError("Header not found"));

		let { source } = header;

		// delete eventual url beginning
		try {
			source = new URL(source).pathname;
		} catch (_error) {
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
		before: AddonStatus,
		notify = true,
	): Promise<Addon> {
		const a = await this.addonRepo.update(id, addon);
		if (notify) await this.notifyAddonChange(a, before).catch(console.error);
		return a;
	}

	private async notifyAddonChange(addon: Addon, before: AddonStatus): Promise<void> {
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
				const user: User = await this.userService.getUserById(author).catch(() => undefined);
				if (user) username = user.username;
			}

			title = `${addon.name} was ${status} by ${username}!`;
			name = "Add-on Review";
		}

		let reason: APIEmbedField[];
		if (status !== "approved")
			reason = [
				{
					name: "Reason",
					value: addon.approval.reason ?? "*No reason provided*",
				},
			];

		discordEmbed({
			title,
			url: `https://webapp.faithfulpack.net/#/review/addons?status=${status}&id=${String(
				addon.id,
			)}`,
			author: {
				name,
				icon_url:
					"https://raw.githubusercontent.com/Faithful-Resource-Pack/Branding/main/role%20icons/14%20-%20Add-On%20Maker.png",
			},
			fields: reason,
		});
	}
}
