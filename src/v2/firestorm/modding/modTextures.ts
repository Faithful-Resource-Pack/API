import firestorm from "firestorm-db";
import { FirestormModTexture } from "../../interfaces";
import "../config";

export const modTextures = firestorm.collection<FirestormModTexture>("mod_textures");
