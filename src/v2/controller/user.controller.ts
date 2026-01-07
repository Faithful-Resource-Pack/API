import {
	Body,
	Controller,
	Delete,
	Get,
	Path,
	Post,
	Put,
	Request,
	Response,
	Route,
	Security,
	Tags,
} from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import { APIUser } from "discord-api-types/v10";
import { BadRequestError, ForbiddenError, NotAvailableError } from "../tools/errorTypes";
import {
	Addon,
	Contribution,
	Username,
	User,
	UserCreationParams,
	UserStats,
	UpdateUserProfile,
} from "../interfaces";
import UserService from "../service/user.service";
import * as cache from "../tools/cache";
import { ExRequestWithAuth } from "../tools/authentication";

@Route("users")
@Tags("Users")
export class UserController extends Controller {
	private readonly service = new UserService();

	/**
	 * Get user information using authentication parameters
	 */
	@Get("profile")
	@Security("discord", [])
	public getProfile(@Request() request: ExRequestWithAuth<string>): Promise<User> {
		return this.service.getUserById(request.user);
	}

	/**
	 * Update a user's profile
	 * @param body New data
	 */
	@Post("profile")
	@Security("discord", [])
	public setProfile(
		@Body() body: UpdateUserProfile,
		@Request() request: ExRequestWithAuth<string>,
	): Promise<User> {
		return this.service.setProfileById(request.user, body);
	}

	/**
	 * Create a new blank user profile
	 */
	@Get("newprofile")
	@Security("discord", ["account:create"])
	public createProfile(@Request() request: ExRequestWithAuth<APIUser>): Promise<User> {
		return this.service.getProfileOrCreate(request.user);
	}

	/**
	 * Get all users in the collection
	 */
	@Get("raw")
	@Security("discord", ["Administrator"])
	@Security("bot")
	public getRaw(): Promise<Record<string, User>> {
		return this.service.getRaw();
	}

	/**
	 * Get all public user stats
	 */
	@Response<NotAvailableError>(408)
	@Get("stats")
	public getStats(): Promise<UserStats> {
		return cache.handle("user-stats", () => this.service.getStats());
	}

	/**
	 * Get all usernames, UUIDs, and IDs
	 */
	@Get("names")
	public getNames(): Promise<Username[]> {
		return this.service.getNames();
	}

	/**
	 * Get all discord roles the database has
	 */
	@Get("roles")
	public getRoles(): Promise<string[]> {
		return this.service.getRoles();
	}

	/**
	 * Get users that have a specific role
	 * @param role The role to search for
	 */
	@Get("role/{role}")
	public getUsersFromRole(@Path() role: string): Promise<User[]> {
		return this.service.getUsersFromRole(role);
	}

	/**
	 * Get users that have a specific role and username
	 * @param role Role name
	 * @param username Discord user username
	 */
	@Get("role/{role}/{username}")
	public async getUsersFromRoleAndUsername(
		@Path() role: string,
		@Path() username: string,
	): Promise<User[]> {
		return this.service.getUsersFromRole(role, username);
	}

	/**
	 * Get a user by their ID or username
	 * @param id_or_username User ID/Username (join by "," if multiple)
	 */
	@Get("{id_or_username}")
	public getUser(@Path() id_or_username: string): Promise<User | User[]> {
		if (typeof id_or_username === "string" && id_or_username.includes(",")) {
			const idArray = id_or_username.split(",");
			return Promise.allSettled(idArray.map((id) => this.service.getUsersByNameOrId(id))).then(
				(res) => res.filter((p) => p.status === "fulfilled").flatMap((p) => p.value),
			);
		}

		return this.service.getUsersByNameOrId(id_or_username);
	}

	/**
	 * Get all contributions a user has made
	 * @param id User ID
	 */
	@Get("{id}/contributions")
	public getContributions(@Path() id: string): Promise<Contribution[]> {
		return this.service.getContributions(id);
	}

	/**
	 * Get the corresponding username for a given user ID
	 * @param id User ID
	 */
	@Get("{id}/name")
	public getName(@Path() id: string): Promise<Username> {
		return this.service.getNameById(id);
	}

	/**
	 * Get all approved add-ons from a given user
	 * @param id User ID
	 */
	@Get("{id}/addons/approved")
	public getAddons(@Path() id: string): Promise<Addon[]> {
		return this.service.getAddons(id);
	}

	/**
	 * Get all add-ons by a given user
	 * @param id User ID
	 */
	@Get("{id}/addons")
	@Security("discord", [])
	@Security("bot")
	public async getAllAddons(
		@Path() id: string,
		@Request() request: ExRequestWithAuth<string>,
	): Promise<Addon[]> {
		if (id !== request.user) {
			// check if admin
			const user = await new UserService().getUserById(request.user);
			if (!user.roles.includes("Administrator"))
				throw new BadRequestError("Addon author must include the authored user");
		}

		return this.service.getAllAddons(id);
	}

	@Put("change/{old_id}/{new_id}")
	@Security("discord", ["Administrator"])
	@Security("bot")
	public async changeUserID(
		@Path() old_id: string,
		@Path() new_id: string,
	): Promise<WriteConfirmation> {
		return this.service.changeUserID(old_id, new_id);
	}

	/**
	 * Create user data
	 * @param body User data
	 */
	@Post("{id}")
	@Security("discord", [])
	@Security("bot")
	public create(@Path() id: string, @Body() body: UserCreationParams): Promise<User> {
		return this.service.create(id, { ...body, id, media: [] });
	}

	/**
	 * Update user data for the given user ID
	 * @param id User ID
	 * @param body User data
	 */
	@Put("{id}")
	@Security("discord", [])
	@Security("bot")
	public async set(
		@Path() id: string,
		@Body() body: UserCreationParams,
		@Request() request: ExRequestWithAuth<string>,
	): Promise<User> {
		// the security middleware adds a key user with anything inside when validated, see security middleware Promise return type
		if (id !== request.user) {
			const user = await this.service.getUserById(id).catch(() => {});

			// admin can modify if they want
			if (user && !user.roles.includes("Administrator"))
				throw new ForbiddenError("Cannot set another user");
		}

		const user = await this.service.getUserById(id).catch(() => {});

		const media = user ? user.media || [] : [];

		// add properties
		const sent: User = { ...body, id, media };
		return this.service.update(id, sent);
	}

	/**
	 * Set roles for a user with the given user ID
	 * @param id User ID
	 * @param roles Role names (not IDs!)
	 */
	@Put("{id}/roles")
	@Security("discord", ["Administrator"])
	@Security("bot")
	public setRoles(@Path() id: string, @Body() roles: string[]): Promise<User> {
		return this.service.setRoles(id, roles);
	}

	/**
	 * Delete the user with the given ID
	 * @param id User ID to be deleted
	 */
	@Delete("{id}")
	@Security("discord", ["account:delete", "Administrator"])
	public remove(@Path() id: string): Promise<WriteConfirmation[]> {
		return this.service.remove(id);
	}
}
