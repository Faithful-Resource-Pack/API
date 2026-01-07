import firestorm, { ID_FIELD, WriteConfirmation } from "firestorm-db";
import FormData from "form-data";
import { files } from "../firestorm";
import { CreationFile, File, FileParent, FileRepository, FileUse } from "../interfaces";

export class FileFirestormRepository implements FileRepository {
	getRaw(): Promise<Record<string, File>> {
		return files.readRaw();
	}

	addFiles(fileList: CreationFile[]): Promise<string[]> {
		return files.addBulk(fileList);
	}

	addFile(file: CreationFile): Promise<string> {
		return files.add(file);
	}

	getFileById(id: string): Promise<File> {
		return files.get(id);
	}

	getFilesByParent(parent: FileParent): Promise<File[]> {
		return files.search([
			{
				field: "parent.id",
				criteria: "==",
				value: String(parent.id),
			},
			{
				field: "parent.type",
				criteria: "==",
				value: parent.type,
			},
		]);
	}

	async setFileById(id: string, file: File): Promise<File> {
		await files.set(id, file);
		return this.getFileById(id);
	}

	removeFileById(id: string): Promise<WriteConfirmation> {
		return files.remove(id);
	}

	async removeFilesByParent(parent: FileParent): Promise<WriteConfirmation> {
		const foundFiles = await this.getFilesByParent(parent);
		return files.removeBulk(foundFiles.map((f) => f[ID_FIELD]));
	}

	async removeFilesByParentAndUse(parent: FileParent, use: FileUse): Promise<WriteConfirmation> {
		const foundFiles = await this.getFilesByParent(parent);
		const ids = foundFiles.filter((f) => f.use === use).map((f) => f[ID_FIELD]);
		return files.removeBulk(ids);
	}

	removeFileByPath(path: string): Promise<WriteConfirmation> {
		return this.remove(path);
	}

	upload(
		path: string,
		filename: string,
		buffer: Buffer,
		overwrite: boolean,
	): Promise<WriteConfirmation> {
		const form = new FormData();
		form.append("path", path);
		form.append("file", buffer, filename);
		form.append("overwrite", String(overwrite === true));

		return firestorm.files.upload(form);
	}

	remove(path: string): Promise<WriteConfirmation> {
		return firestorm.files.delete(path);
	}
}
