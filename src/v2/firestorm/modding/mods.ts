import firestorm from "firestorm-db";
import { FirestormMod } from "../../interfaces";
import "../config";

export const mods = firestorm.collection<FirestormMod>("mods");
