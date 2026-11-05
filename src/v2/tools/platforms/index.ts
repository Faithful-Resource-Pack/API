import { ModPlatform } from "../../interfaces";
import { curseforge } from "./curseforge";
import { modrinth } from "./modrinth";
import { PlatformClient } from "./types";

export * from "./types";

export const platforms: Record<ModPlatform, PlatformClient> = { curseforge, modrinth };
