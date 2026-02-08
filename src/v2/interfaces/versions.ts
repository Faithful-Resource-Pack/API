import { Edition } from "./textures";

export interface NewVersionParam {
	edition: Edition;
	template?: string;
	version: string;
}
