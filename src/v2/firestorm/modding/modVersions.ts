import firestorm from "firestorm-db";
import { FirestormModVersion } from "../../interfaces";
import "../config";

export const modVersions = firestorm.collection<FirestormModVersion>("mod_versions");
