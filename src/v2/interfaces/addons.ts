import { Files } from "./files";

export interface AddonDownload {
	key: string;
	links: string[];
}

export const AddonStatusNotApproved = ["archived", "denied", "pending"] as const;
export const AddonStatusApproved = "approved" as const;
export const AddonStatusValues = [...AddonStatusNotApproved, AddonStatusApproved] as const;

export type AddonNotApproved = (typeof AddonStatusNotApproved)[number];
export type AddonStatus = (typeof AddonStatusValues)[number];

export type AddonProperty = "files" | "all";

export interface AddonReviewBody {
	status: null | AddonStatus;
	reason: null | string; // reason of deny
}

export interface AddonReview extends AddonReviewBody {
	author: null | string; // approval/deny author -> Discord ID
}

export interface CreationAddon {
	name: string; // addon name (> 5 && < 30)
	slug: string; // used in link (ex: 'www.faithfulpack.net/addons/Faithful3D')
	description: string; // addon description (> 256 && < 4096)
	authors: string[]; // discord users IDs
	options: {
		optifine: boolean; // true if the pack require optifine to work properly
		tags: string[]; // Editions + Resolutions
	};
	embed_description?: string;
	last_updated?: number;
	approval: AddonReview;
}

export interface Addon extends CreationAddon {
	id: string;
}

export type Addons = Addon[];

export type AddonDataParam = Pick<
	Addon,
	"name" | "description" | "authors" | "options" | "embed_description"
>;

export interface AddonCreationParam extends AddonDataParam {
	downloads: AddonDownload[];
}

export interface AddonUpdateParam extends AddonCreationParam {
	reason: string;
	slug?: string; // only used for admin edits
}

export interface AddonAll extends Addon {
	files: Files;
}
export type AddonsAll = AddonAll[];

export interface AddonStats {
	approved: number;
	numbers: Record<string, number>;
}

export interface AddonStatsAdmin extends AddonStats {
	pending: number;
	denied: number;
	archived: number;
}

export interface FirestormAddon extends Addon {
	getFiles(): Promise<Files>;
	all(): Promise<AddonAll>;
}
