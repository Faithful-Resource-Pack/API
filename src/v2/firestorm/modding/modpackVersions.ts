import firestorm from "firestorm-db";
import { FirestormModpackVersion } from "../../interfaces";
import "../config";

export const modpackVersions = firestorm.collection<FirestormModpackVersion>("modpack_versions");
