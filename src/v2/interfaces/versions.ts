import { MinecraftEdition } from "./textures";

export interface NewVersionParam {
	edition: MinecraftEdition;
	template?: string;
	version: string;
}
