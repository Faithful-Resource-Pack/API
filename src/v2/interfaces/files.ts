// DO NOT REMOVE THIS IMPORT (vscode shows it as unused for some reason)
import { Express } from "express";

// multer monkey patches express's types and eslint really doesn't like that
// so we need to export this separately to prevent issues
export type MulterFile = Express.Multer.File;

export interface FileParent {
	type: string; // collection name (addon, post...)
	id: string | number; // id of the parent
}

export type FileUse = "download" | "header" | "screenshot";

export interface CreationFile {
	name: string | null; // file name when uploaded
	use: FileUse;
	type: "url" | "b64";
	parent: FileParent;
	source: string; // file content/url (ex: 'database.faithfulpack.net/images/test.png')
}

export interface File extends CreationFile {
	id: string; // file unique id
}
export type Files = File[];
export type CreationFiles = CreationFile[];

//! needs to be approved & finished by @TheRolfFR
export type FileDataParam = Pick<File, "name" | "use" | "type">;
export interface FileCreationParam extends FileDataParam {}

export interface FirestormFile extends File {}
