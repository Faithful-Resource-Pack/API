import { WriteConfirmation } from "firestorm-db";
import * as FileRepo from "../repository/files.repository";
import { FileParent, FileUse, File, CreationFile, CreationFiles } from "../interfaces/files";

export default class FileService {
	public removeFileByPath(path: string): Promise<WriteConfirmation> {
		return FileRepo.removeFileByPath(path);
	}

	public getFileById(id: string) {
		return FileRepo.getFileById(id);
	}

	public getFilesByParent(id: FileParent) {
		return FileRepo.getFilesByParent(id);
	}

	public removeFilesByParentAndUse(parent: FileParent, use: FileUse): Promise<WriteConfirmation> {
		return FileRepo.removeFilesByParentAndUse(parent, use);
	}

	public removeFilesByParent(parent: FileParent): Promise<WriteConfirmation> {
		return FileRepo.removeFilesByParent(parent);
	}

	public addFile(file: CreationFile): Promise<string> {
		return FileRepo.addFile(file);
	}

	public addFiles(files: CreationFiles): Promise<string[]> {
		return FileRepo.addFiles(files);
	}

	public removeFileById(id: string): Promise<WriteConfirmation> {
		return FileRepo.removeFileById(id);
	}

	public upload(
		path: string,
		filename: string,
		buffer: Buffer,
		overwrite = false,
	): Promise<WriteConfirmation> {
		return FileRepo.upload(path, filename, buffer, overwrite);
	}

	public remove(path: string): Promise<WriteConfirmation> {
		return FileRepo.remove(path);
	}

	public getRaw(): Promise<Record<string, File>> {
		return FileRepo.getRaw();
	}
}
