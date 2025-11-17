import { SearchOption, WriteConfirmation } from "firestorm-db";
import {
	Contribution,
	ContributionCreationParams,
	Contributions,
	ContributionsAuthors,
	PackID,
	ContributionsAuthor,
} from "../interfaces";
import { contributions, users } from "../firestorm";

export function getRaw(): Promise<Record<string, Contribution>> {
	return contributions.readRaw();
}

export function getContributionById(id: string): Promise<Contribution> {
	return contributions.get(id);
}

export function getPacks(): Promise<PackID[]> {
	return contributions.values({ field: "pack" });
}

export async function searchContributionsFrom(
	authors: string[],
	packs?: string[],
): Promise<Contributions> {
	const options: SearchOption<Contribution>[] = authors.map((author) => ({
		field: "authors",
		criteria: "array-contains",
		value: author,
	}));

	if (packs !== undefined) options.push({ field: "pack", criteria: "in", value: packs });
	return contributions.search(options);
}

export function searchByIdAndPacks(
	textureIDs: string[],
	packs?: string[],
	authors?: string[],
): Promise<Contributions> {
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

export async function getAuthors(): Promise<ContributionsAuthors> {
	// don't use values because we need duplicates
	const contributionSelect = await contributions.select({ fields: ["authors"] });
	const authors = Object.values(contributionSelect).flatMap((c) => c.authors);

	type PartialAuthor = Pick<ContributionsAuthor, "id" | "contributions">;
	const out = authors.reduce<Record<string, PartialAuthor>>((acc, id) => {
		acc[id] ||= { id, contributions: 0 };
		acc[id].contributions++;
		return acc;
	}, {});

	const userSelect = await users.select({ fields: ["username", "uuid", "anonymous"] });
	return Object.values(out).map((author: ContributionsAuthor) => {
		const user = userSelect[author.id];
		if (user && !user.anonymous) {
			author.username = user.username;
			author.uuid = user.uuid;
		}

		return author;
	});
}

export async function addContribution(params: ContributionCreationParams): Promise<Contribution> {
	const id = await contributions.add(params);
	return contributions.get(id);
}

export async function addContributions(
	params: ContributionCreationParams[],
): Promise<Contributions> {
	const ids = await contributions.addBulk(params);
	return contributions.searchKeys(ids);
}

export async function updateContribution(
	id: string,
	params: ContributionCreationParams,
): Promise<Contribution> {
	await contributions.set(id, params);
	return contributions.get(id);
}

export function deleteContribution(id: string): Promise<WriteConfirmation> {
	return contributions.remove(id);
}

export async function getByDateRange(begin: string, ends: string): Promise<Contributions> {
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
