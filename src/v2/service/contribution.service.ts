import { WriteConfirmation } from "firestorm-db";
import { contributions } from "../firestorm";
import { Contribution, Contributions, PackID } from "../interfaces";
import {
	ContributionCreationParams,
	ContributionsAuthors,
	ContributionSearch,
	ContributionStats,
	PackData,
	PackPercentile,
	PackRecord,
} from "../interfaces/contributions";
import ContributionFirestormRepository from "../repository/contribution.repository";
import { lastDay, lastMonth, lastWeek, startOfDay } from "../tools/utils";
import TextureService from "./texture.service";

export default class ContributionService {
	private readonly contributionRepo = new ContributionFirestormRepository();

	private readonly textureService = new TextureService();

	getRaw(): Promise<Record<string, Contribution>> {
		return contributions.readRaw();
	}

	async getStats(): Promise<ContributionStats> {
		const cs = await this.getRaw();

		// set ensures unique values much more quickly than a check object
		const authors = new Set();

		// snake case because these are being jsonified
		let total_last_week = 0;
		let total_last_month = 0;
		let total_last_day = 0;

		const last_month = startOfDay(lastMonth());
		const last_week = startOfDay(lastWeek());
		const last_day = startOfDay(lastDay());

		const groupedActivity = Object.values(cs).reduce<PackRecord>((acc, cur) => {
			// for some reason you can't add multiple values to a set at once (blame JS)
			cur.authors.forEach(authors.add, authors);

			const { pack, date } = cur;
			const start_of_day = startOfDay(date);

			// key by pack then date to remove duplicates
			acc[pack] ||= {};
			acc[pack][start_of_day] ||= {
				date: start_of_day,
				count: 0,
			};
			acc[pack][start_of_day].count++;

			if (date >= last_week) total_last_week++;
			if (date >= last_month) total_last_month++;
			if (date >= last_day) total_last_day++;
			return acc;
		}, {});

		const { finalActivity, percentiles } = Object.entries(groupedActivity).reduce(
			(acc, [pack, packActivity]) => {
				const activity = Object.values(packActivity);
				// no longer need the date key since it's in the value object already
				acc.finalActivity[pack] = activity;

				const counts = activity.map((e) => e.count).sort();

				acc.percentiles[pack] = counts[Math.round((counts.length * 95) / 100)];
				return acc;
			},
			{ finalActivity: {} as PackData, percentiles: {} as PackPercentile },
		);

		return {
			total_authors: authors.size,
			total_contributions: Object.keys(cs).length,
			total_last_day,
			total_last_week,
			total_last_month,
			activity: finalActivity,
			percentiles,
		};
	}

	getPacks(): Promise<PackID[]> {
		return this.contributionRepo.getPacks();
	}

	getAuthors(): Promise<ContributionsAuthors> {
		return this.contributionRepo.getAuthors();
	}

	searchContributionsFrom(users: string[], packs?: string[]): Promise<Contributions> {
		return this.contributionRepo.searchContributionsFrom(users, packs);
	}

	async search(params: ContributionSearch): Promise<Contributions> {
		let result: Contributions;
		if (params.search) {
			let res = await this.textureService.getByNameOrId(params.search);
			if (!Array.isArray(res)) res = [res];

			const textureIDs = res.map((t) => t.id);

			result = await this.contributionRepo.searchByIdAndPacks(
				textureIDs,
				params.packs,
				params.users,
			);
		} else {
			result = await this.searchContributionsFrom(params.users || [], params.packs);
		}

		return result;
	}

	getById(id: string): Promise<Contribution> {
		return this.contributionRepo.getContributionById(id);
	}

	addContribution(params: ContributionCreationParams): Promise<Contribution> {
		return this.contributionRepo.addContribution(params);
	}

	addContributions(params: ContributionCreationParams[]): Promise<Contributions> {
		return this.contributionRepo.addContributions(params);
	}

	deleteContribution(id: string): Promise<WriteConfirmation> {
		return this.contributionRepo.deleteContribution(id);
	}

	updateContribution(id: string, params: ContributionCreationParams): Promise<Contribution> {
		return this.contributionRepo.updateContribution(id, params);
	}

	getByDateRange(begin: string, ends: string): Promise<Contributions> {
		return this.contributionRepo.getByDateRange(begin, ends);
	}
}
