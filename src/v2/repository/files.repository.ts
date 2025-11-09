import firestorm, { ID_FIELD, WriteConfirmation } from "firestorm-db";
import FormData from "form-data";
import { files } from "../firestorm";
import { CreationFile, CreationFiles, File, FileParent, Files, FileUse } from "../interfaces/files";

export function getRaw(): Promise<Record<string, File>> {
	return files.readRaw();
}

export function addFiles(fileList: CreationFiles): Promise<string[]> {
	return files.addBulk(fileList);
}

export function addFile(file: CreationFile): Promise<string> {
	return files.add(file);
}

export function getFileById(id: string): Promise<File> {
	return files.get(id);
}

export function getFilesByParent(parent: FileParent): Promise<Files> {
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

export async function setFileById(id: string, file: File): Promise<File> {
	await files.set(id, file);
	return getFileById(id);
}

export function removeFileById(id: string): Promise<WriteConfirmation> {
	return files.remove(id);
}

export async function removeFilesByParent(parent: FileParent): Promise<WriteConfirmation> {
	const foundFiles = await getFilesByParent(parent);
	return files.removeBulk(foundFiles.map((f) => f[ID_FIELD]));
}

export async function removeFilesByParentAndUse(
	parent: FileParent,
	use: FileUse,
): Promise<WriteConfirmation> {
	const foundFiles = await getFilesByParent(parent);
	const ids = foundFiles.filter((f) => f.use === use).map((f) => f[ID_FIELD]);
	return files.removeBulk(ids);
}

export function removeFileByPath(path: string): Promise<WriteConfirmation> {
	return remove(path);
}

export function upload(
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

export function remove(path: string): Promise<WriteConfirmation> {
	return firestorm.files.delete(path);
}
