import {
	Body,
	Controller,
	Delete,
	Get,
	Post,
	Put,
	Query,
	Response,
	Route,
	Security,
	Tags,
} from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import {
	Contributions,
	Contribution,
	ContributionCreationParams,
	ContributionsAuthors,
	ContributionStats,
	PackID,
} from "../interfaces";
import ContributionService from "../service/contribution.service";
import { NotAvailableError } from "../tools/errorTypes";
import * as cache from "../tools/cache";

@Route("contributions")
@Tags("Contributions")
export class ContributionController extends Controller {
	private readonly service = new ContributionService();

	/**
	 * Get all contributions in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Contribution>> {
		return this.service.getRaw();
	}

	/**
	 * Get all general contribution statistics
	 */
	@Response<NotAvailableError>(408)
	@Get("stats")
	public getStats(): Promise<ContributionStats> {
		return cache.handle("contributions-stats", () => this.service.getStats());
	}

	/**
	 * Get all resource packs with contributions
	 */
	@Get("packs")
	public getPacks(): Promise<PackID[]> {
		return this.service.getPacks();
	}

	/**
	 * Get all users who have contributed to a resource pack before
	 */
	@Get("authors")
	public getAuthors(): Promise<ContributionsAuthors> {
		return this.service.getAuthors();
	}

	/**
	 * Filter contributions by either pack or contributor
	 * @param packs List of resource packs joined by '-'
	 * @param users List of user ids joined by '-'
	 * @param search Contribution to search for
	 */
	@Get("search")
	public searchWithTextureAndUser(
		@Query() packs?: string,
		@Query() users?: string,
		@Query() search?: string,
	): Promise<Contributions> {
		return this.service.search({
			packs: packs && packs !== "all" ? packs.split("-") : undefined,
			users: users ? users.split("-") : [],
			search,
		});
	}

	/**
	 * Get contribution by ID (e.g. 61cdce61d3697)
	 * @param id Contribution ID
	 */
	@Get("{id}")
	public getContributionById(id: string): Promise<Contribution> {
		return this.service.getById(id);
	}

	/**
	 * Get contributions by user and pack
	 * @param users List of user ids joined by '-'
	 * @param packs List of resource packs joined by '-'
	 */
	@Get("search/{users}/{packs}")
	public searchContributionsFrom(users: string, packs: string): Promise<Contributions> {
		if (packs === "all") return this.service.searchContributionsFrom(users.split("-"));
		return this.service.searchContributionsFrom(users.split("-"), packs.split("-"));
	}

	/**
	 * Get all contributions between a given set of timestamps
	 * @param begin Starting timestamp
	 * @param ends Ending timestamp
	 */
	@Get("between/{begin}/{ends}")
	public getContributionInRange(begin: string, ends: string): Promise<Contributions> {
		return this.service.getByDateRange(begin, ends);
	}

	/**
	 * Get all contributions from a given date until now
	 * @param timestamp Where to start counting
	 */
	@Get("from/{timestamp}")
	public getContributionFrom(timestamp: string): Promise<Contributions> {
		return this.service.getByDateRange(timestamp, Date.now().toString());
	}

	/**
	 * Get all contributions before a given date
	 * @param timestamp Where to stop counting
	 */
	@Get("before/{timestamp}")
	public getContributionBefore(timestamp: string): Promise<Contributions> {
		return this.service.getByDateRange("0", timestamp);
	}

	/**
	 * Add a contribution or multiple contributions
	 * @param body Contribution information
	 */
	@Post()
	@Security("discord", ["administrator"])
	@Security("bot")
	public addContribution(
		@Body() body: ContributionCreationParams | ContributionCreationParams[],
	): Promise<Contribution | Contributions> {
		return Array.isArray(body)
			? this.service.addContributions(body)
			: this.service.addContribution(body);
	}

	/**
	 * Delete a contribution by its ID (e.g. 61cdce61d3697)
	 * @param id Contribution ID
	 */
	@Delete("{id}")
	@Security("discord", ["administrator"])
	@Security("bot")
	public deleteContribution(id: string): Promise<WriteConfirmation> {
		return this.service.deleteContribution(id);
	}

	/**
	 * Update existing contribution with new information by ID (e.g. 61cdce61d3697)
	 * @param id Contribution ID
	 * @param body New information
	 */
	@Put("{id}")
	@Security("discord", ["administrator"])
	@Security("bot")
	public updateContribution(
		id: string,
		@Body() body: ContributionCreationParams,
	): Promise<Contribution> {
		return this.service.updateContribution(id, body);
	}
}
