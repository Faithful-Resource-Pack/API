import { CreationFile, File, Files, MulterFile } from "../interfaces";
import { BadRequestError, NotFoundError } from "../tools/errorTypes";
import FileService from "./file.service";
import { WriteConfirmation } from "firestorm-db";
import AddonService from "./addon.service";
import { URL } from "url";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg"];

export default class AddonFileService {
	private readonly fileService = new FileService();
	private readonly addonService = new AddonService();

	private validateImageType(mediaType: string) {
		if (!ACCEPTED_IMAGE_TYPES.includes(mediaType))
			throw new BadRequestError(
				`Incorrect MIME type for input file: got ${mediaType}, expected ${ACCEPTED_IMAGE_TYPES.join(" | ")}`,
			);
	}

	public async postHeader(
		idOrSlug: string,
		filename: string,
		multerFile: MulterFile,
	): Promise<File> {
		this.validateImageType(multerFile.mimetype);
		const { buffer } = multerFile;

		const [addonID, addon] = await this.addonService.getAddonFromSlugOrId(idOrSlug);
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

		await this.addonService.saveUpdate(addonID, addon, before);

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
	): Promise<File> {
		this.validateImageType(multerFile.mimetype);
		const { buffer } = multerFile;

		const [addonID, addon] = await this.addonService.getAddonFromSlugOrId(idOrSlug);
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

		await this.addonService.saveUpdate(addonID, addon, before);

		// upload file
		await this.fileService.upload(uploadLocation, filename, buffer, true);

		const newFile: CreationFile = {
			name: `screen${newName}`,
			use: "screenshot",
			parent: {
				id: addonID,
				type: "addons",
			},
			type: "url",
			source: uploadLocation,
		};

		// add file to db
		const id = await this.fileService.addFile(newFile);
		return this.fileService.getFileById(id);
	}

	public async deleteScreenshot(
		idOrSlug: string,
		indexOrSlug: number | string,
	): Promise<[WriteConfirmation, WriteConfirmation]> {
		const [addonID] = await this.addonService.getAddonFromSlugOrId(idOrSlug);

		// get existing screenshots
		const files = await this.fileService
			.getFilesByParent({ id: addonID, type: "addons" })
			.catch<Files>(() => []);
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

		return Promise.all([
			// remove file from file service
			this.fileService.removeFileById(screen.id),
			// remove actual file
			this.fileService.remove(source),
		]);
	}

	public async deleteHeader(idOrSlug: string): Promise<[WriteConfirmation, WriteConfirmation]> {
		const [addonID, addon] = await this.addonService.getAddonFromSlugOrId(idOrSlug);
		const before = addon.approval.status || null;

		addon.approval = {
			reason: null,
			author: null,
			status: "pending",
		};

		// get existing screenshots
		const files = await this.fileService
			.getFilesByParent({ id: addonID, type: "addons" })
			.catch<Files>(() => []);
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

		await this.addonService.saveUpdate(addonID, addon, before, false);

		return Promise.all([
			// remove file from file service
			this.fileService.removeFileById(header.id),
			// remove actual file
			this.fileService.remove(source),
		]);
	}
}
