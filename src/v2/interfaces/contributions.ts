import { WriteConfirmation } from "firestorm-db";
import { PackID } from "./packs";

export interface ContributionCreationParams {
	date: number; // unix timestamp
	pack: PackID; // resource pack name
	authors: string[]; // discord user ids
	texture: string; // texture id
}

export interface Contribution extends ContributionCreationParams {
	id: string; // contribution unique id
}

export interface ContributionAuthor {
	id: string; // discord user id
	username?: string; // display name
	uuid?: string; // user Minecraft uuid
	contributions: number; // total contribution count
}

export interface DayData {
	date: number; // day as timestamp
	count: number; // number of contributions
}

export type DayRecord = Record<number, DayData>;

export type PackRecord = Record<PackID, DayRecord>;
export type PackPercentile = Record<PackID, number>;
export type PackData = Record<PackID, DayData[]>;

export interface ContributionStats {
	total_contributions: number; // number of total contributions
	total_authors: number; // number of users on contributions
	total_last_day: number;
	total_last_week: number;
	total_last_month: number;
	activity: PackData;
	percentiles: PackPercentile;
}

// evolve this interface as parameter instead of function parameters
export interface ContributionSearch {
	packs?: string[];
	users?: string[];
	search?: string;
}

export interface FirestormContribution extends Contribution {}

export interface ContributionsRepository {
	getContributionById(id: string): Promise<Contribution>;
	addContribution(params: ContributionCreationParams): Promise<Contribution>;
	addContributions(params: ContributionCreationParams[]): Promise<Contribution[]>;
	deleteContribution(id: string): Promise<WriteConfirmation>;
	updateContribution(id: string, params: ContributionCreationParams): Promise<Contribution>;
	getByDateRange(begin: string, ends: string): Promise<Contribution[]>;
	getAuthors(): Promise<ContributionAuthor[]>;
	getPacks(): Promise<PackID[]>;
	searchByIdAndPacks(
		textureIDs: string[],
		packs: string[],
		users?: string[],
	): Promise<Contribution[]>;
	searchContributionsFrom(users: string[], packs: string[]): Promise<Contribution[]>;
}
