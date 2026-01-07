import { SearchOption, WriteConfirmation } from "firestorm-db";
import {
	Contribution,
	ContributionAuthor,
	ContributionCreationParams,
	ContributionsRepository,
	PackID,
} from "../interfaces";
import { contributions, users } from "../firestorm";

export default class ContributionFirestormRepository implements ContributionsRepository {
	getContributionById(id: string): Promise<Contribution> {
		return contributions.get(id);
	}

	getPacks(): Promise<PackID[]> {
		return contributions.values({ field: "pack" });
	}

	async searchContributionsFrom(authors: string[], packs?: string[]): Promise<Contribution[]> {
		const options: SearchOption<Contribution>[] = authors.map((author) => ({
			field: "authors",
			criteria: "array-contains",
			value: author,
		}));

		if (packs !== undefined) options.push({ field: "pack", criteria: "in", value: packs });
		return contributions.search(options);
	}

	searchByIdAndPacks(
		textureIDs: string[],
		packs?: string[],
		authors?: string[],
	): Promise<Contribution[]> {
		const options: SearchOption<Contribution>[] = [
			{
				field: "texture",
				criteria: "in",
				value: textureIDs,
			},
		];

		if (authors) {
			// no idea why specifying the type in .map is required but it is
			options.push(
				...authors.map<SearchOption<Contribution>>((a) => ({
					field: "authors",
					criteria: "array-contains",
					value: a,
				})),
			);
		}

		if (packs) options.push({ field: "pack", criteria: "in", value: packs });

		return contributions.search(options);
	}

	async getAuthors(): Promise<ContributionAuthor[]> {
		// don't use values because we need duplicates
		const contributionSelect = await contributions.select({ fields: ["authors"] });
		const authors = Object.values(contributionSelect).flatMap((c) => c.authors);

		type PartialAuthor = Pick<ContributionAuthor, "id" | "contributions">;
		const out = authors.reduce<Record<string, PartialAuthor>>((acc, id) => {
			acc[id] ||= { id, contributions: 0 };
			acc[id].contributions++;
			return acc;
		}, {});

		const userSelect = await users.select({ fields: ["username", "uuid", "anonymous"] });
		return Object.values(out).map((author: ContributionAuthor) => {
			const user = userSelect[author.id];
			if (user && !user.anonymous) {
				author.username = user.username;
				author.uuid = user.uuid;
			}

			return author;
		});
	}

	async addContribution(params: ContributionCreationParams): Promise<Contribution> {
		const id = await contributions.add(params);
		return contributions.get(id);
	}

	async addContributions(params: ContributionCreationParams[]): Promise<Contribution[]> {
		const ids = await contributions.addBulk(params);
		return contributions.searchKeys(ids);
	}

	async updateContribution(id: string, params: ContributionCreationParams): Promise<Contribution> {
		await contributions.set(id, params);
		return contributions.get(id);
	}

	deleteContribution(id: string): Promise<WriteConfirmation> {
		return contributions.remove(id);
	}

	async getByDateRange(begin: string, ends: string): Promise<Contribution[]> {
		// if ends > begin date : ------[B-----E]------
		// else if begin > ends :    -----E]-------[B-----

		if (ends >= begin)
			return contributions.search([
				{
					field: "date",
					criteria: ">=",
					value: begin,
				},
				{
					field: "date",
					criteria: "<=",
					value: ends,
				},
			]);

		const startContribs = await contributions.search([
			{
				field: "date",
				criteria: ">=",
				value: "0",
			},
			{
				field: "date",
				criteria: "<=",
				value: ends,
			},
		]);
		const endContribs = await contributions.search([
			{
				field: "date",
				criteria: ">=",
				value: begin,
			},
			{
				field: "date",
				criteria: "<=",
				value: Date.now(),
			},
		]);
		return { ...startContribs, ...endContribs };
	}
}
