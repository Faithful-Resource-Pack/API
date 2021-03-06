import { contributions } from "../firestorm";
import { Contribution, Contributions, ContributionsPacks } from "../interfaces";
import { ContributionCreationParams, ContributionsAuthors, ContributionSearch, ContributionsRepository, ContributionStats, DayRecord, PackData, PackPercentile, PackRecord } from "../interfaces/contributions";
import ContributionFirestormRepository from "../repository/firestorm/contributions.repository";
import { lastMonth, lastWeek } from "../tools/utils";
import TextureService from "./texture.service";

export default class ContributionService {
	private readonly contributionRepo: ContributionsRepository = new ContributionFirestormRepository();

	private readonly textureService: TextureService = new TextureService();

	getRaw(): Promise<Contributions> {
		return contributions.read_raw().then((res: any) => Object.values(res));
	}

	getStats(): Promise<ContributionStats> {
		return this.getRaw()
			.then(cs => {
				let total_authors = 0;
				let total_contributions = 0;
				const authors = {};
				let total_last_week = 0;
				let total_last_month = 0;
				const activity = {} as PackRecord;
				const percentiles = {} as PackPercentile;

				const last_month = lastMonth();
				const last_week = lastWeek();

				cs.forEach((cur) => {
					total_contributions += 1;
				
					cur.authors.forEach(a => {
						if(!authors[a]) {
							authors[a] = true;
							total_authors++;
						}
					})

					if(!(cur.pack in activity)) activity[cur.pack] = {} as DayRecord
					if(!(cur.date in activity[cur.pack])) activity[cur.pack][cur.date] = {
						date: cur.date,
						count: 0
					}
					activity[cur.pack][cur.date].count++;

					// last week and last month
					const date = new Date(cur.date);
					if(date >= last_week) {
						total_last_week += 1;
					}
					if(date >= last_month) {
						total_last_month += 1;
					}
				})

				const final_activity = {} as PackData;

				Object.keys(activity).forEach(pack => {
					final_activity[pack] = Object.values(activity[pack])

					const counts = Object.values(activity[pack]).map((e: Record<any,any>) => e.count).filter(e => e !== 0).sort()
					percentiles[pack] = counts[Math.round(counts.length*95/100)]
				})

				return {
					total_authors,
					total_contributions,
					total_last_week,
					total_last_month,
					activity: final_activity,
					percentiles
				};
			})
	}

	getPacks(): ContributionsPacks  {
		return this.contributionRepo.getPacks();
	}

	getAuthors(): Promise<ContributionsAuthors> {
		return this.contributionRepo.getAuthors();
	}

	searchContributionsFrom(users: Array<string>, packs: Array<string>): Promise<Contributions> {
		return this.contributionRepo.searchContributionsFrom(users, packs);
	}
	
	async search(params: ContributionSearch): Promise<Contributions> {
		let result: Contributions;
		if(params.search) {
			let res = await this.textureService.getByNameOrId(params.search);
			if(!Array.isArray(res)) {
				res = [res];
			}
			
			const texture_ids = res.map(t => t.id);

			result = await this.contributionRepo.searchByIdAndPacks(texture_ids, params.packs, params.users);
		} else {
			result = await this.searchContributionsFrom(params.users, params.packs);
		}

		return result;
	}

	getById(id: string): Promise<Contribution> {
		return this.contributionRepo.getContributionById(id);
	}

	addContribution(params: ContributionCreationParams): Promise<Contribution> {
		return this.contributionRepo.addContribution(params);
	}

	deleteContribution(id: string): Promise<void> {
		return this.contributionRepo.deleteContribution(id);
	}

	updateContribution(id: string, params: ContributionCreationParams): Promise<Contribution> {
		return this.contributionRepo.updateContribution(id, params);
	}

	getByDateRange(begin: string, ends: string): Promise<Contributions> {
		return this.contributionRepo.getByDateRange(begin, ends);
	}
}