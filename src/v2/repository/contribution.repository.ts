import { SearchOption, WriteConfirmation } from "firestorm-db";
import {
	Contribution,
	ContributionCreationParams,
	Contributions,
	ContributionsRepository,
	ContributionsAuthors,
	PackID,
	ContributionsAuthor,
} from "../interfaces";
import { contributions, users } from "../firestorm";

export default class ContributionFirestormRepository implements ContributionsRepository {
	getContributionById(id: string): Promise<Contribution> {
		return contributions.get(id);
	}

	getPacks(): Promise<PackID[]> {
		return contributions.values({ field: "pack" });
	}

	async searchContributionsFrom(authors: string[], packs: string[]): Promise<Contributions> {
		const options: SearchOption<Contribution>[] = authors.map((author) => ({
			field: "authors",
			criteria: "array-contains",
			value: author,
		}));

		if (packs !== null) options.push({ field: "pack", criteria: "in", value: packs });
		const res = await contributions.search(options);
		return res.filter((c) => (packs === null ? true : packs.includes(c.pack)));
	}

	searchByIdAndPacks(
		textureIDs: string[],
		packs?: string[],
		authors?: string[],
	): Promise<Contributions> {
		const options = [];
		if (authors) {
			options.push(
				...authors.map((author) => ({
					field: "authors",
					criteria: "array-contains",
					value: author,
				})),
			);
		}

		if (packs) options.push({ field: "pack", criteria: "in", value: packs });

		options.push({
			field: "texture",
			criteria: "in",
			value: textureIDs,
		});

		return contributions.search(options);
	}

	async getAuthors(): Promise<ContributionsAuthors> {
		// don't use values because we need duplicates
		const contributionSelect = await contributions.select({ fields: ["authors"] });
		const authors = Object.values(contributionSelect).flatMap((c) => c.authors);

		const out: Record<string, ContributionsAuthor> = authors.reduce((acc, id) => {
			if (!acc[id]) acc[id] = { id, contributions: 0 };
			acc[id].contributions++;
			return acc;
		}, {});

		const userSelect = await users.select({ fields: ["id", "username", "uuid", "anonymous"] });
		return Object.values(out).map((author) => {
			const user = userSelect[author.id];
			if (user) {
				author.username = user.anonymous ? undefined : user.username;
				author.uuid = user.anonymous ? undefined : user.uuid;
			}

			return author;
		});
	}

	async addContribution(params: ContributionCreationParams): Promise<Contribution> {
		const id = await contributions.add(params);
		return contributions.get(id);
	}

	async addContributions(params: ContributionCreationParams[]): Promise<Contributions> {
		const ids = await contributions.addBulk(params);
		return Promise.all(ids.map((id) => contributions.get(id)));
	}

	async updateContribution(id: string, params: ContributionCreationParams): Promise<Contribution> {
		await contributions.set(id, params);
		return contributions.get(id);
	}

	deleteContribution(id: string): Promise<WriteConfirmation> {
		return contributions.remove(id);
	}

	async getByDateRange(begin: string, ends: string): Promise<Contributions> {
		// if ends > begin date : ------[B-----E]------
		// elif begin > ends :    -----E]-------[B-----

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

		const startContribution = await contributions.search([
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
		const endsContribution = await contributions.search([
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
		return { ...startContribution, ...endsContribution };
	}
}
