import { Controller, Get, Route, Security, Tags } from "tsoa";
import FileService from "../service/file.service";
import { File } from "../interfaces";

@Route("files")
@Tags("Files")
export class FileController extends Controller {
	private readonly service = new FileService();

	/**
	 * Get all files in the collection
	 */
	@Get("raw")
	@Security("bot")
	public getRaw(): Promise<Record<string, File>> {
		return this.service.getRaw();
	}
}
