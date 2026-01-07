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
	Contribution,
	ContributionAuthor,
	ContributionCreationParams,
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
	 * Get all current contributions in the database (excludes replaced textures)
	 */
	@Get("current")
	public getCurrent(): Promise<Contribution[]> {
		return this.service.getCurrent();
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
	public getAuthors(): Promise<ContributionAuthor[]> {
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
	): Promise<Contribution[]> {
		return this.service.search({
			packs: packs && packs !== "all" ? packs.split("-") : undefined,
			users: users ? users.split("-") : [],
			search,
		});
	}

	/**
	 * Get all contributions between a given set of timestamps
	 * @param begin Starting timestamp
	 * @param ends Ending timestamp
	 */
	@Get("between/{begin}/{ends}")
	public getContributionInRange(begin: string, ends: string): Promise<Contribution[]> {
		return this.service.getByDateRange(begin, ends);
	}

	/**
	 * Get all contributions from a given date until now
	 * @param timestamp Where to start counting
	 */
	@Get("after/{timestamp}")
	public getContributionFrom(timestamp: string): Promise<Contribution[]> {
		return this.service.getByDateRange(timestamp, Date.now().toString());
	}

	/**
	 * Get all contributions before a given date
	 * @param timestamp Where to stop counting
	 */
	@Get("before/{timestamp}")
	public getContributionBefore(timestamp: string): Promise<Contribution[]> {
		return this.service.getByDateRange("0", timestamp);
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
	 * Add a contribution or multiple contributions
	 * @param body Contribution information
	 */
	@Post()
	@Security("discord", ["Administrator"])
	@Security("bot")
	public addContribution(
		@Body() body: ContributionCreationParams | ContributionCreationParams[],
	): Promise<Contribution | Contribution[]> {
		return Array.isArray(body)
			? this.service.addContributions(body)
			: this.service.addContribution(body);
	}

	/**
	 * Delete a contribution by its ID (e.g. 61cdce61d3697)
	 * @param id Contribution ID
	 */
	@Delete("{id}")
	@Security("discord", ["Administrator"])
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
	@Security("discord", ["Administrator"])
	@Security("bot")
	public updateContribution(
		id: string,
		@Body() body: ContributionCreationParams,
	): Promise<Contribution> {
		return this.service.updateContribution(id, body);
	}
}
