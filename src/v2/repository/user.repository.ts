import { ID_FIELD, SearchOption, WriteConfirmation } from "firestorm-db";
import { AxiosError } from "axios";
import { APIUser } from "discord-api-types/v10";
import { users, contributions, addons } from "../firestorm";
import {
	Addons,
	Contributions,
	Usernames,
	User,
	Users,
	UserCreationParams,
	UserRepository,
	Username,
	UserProfile,
} from "../interfaces";
import { NotFoundError } from "../tools/errorTypes";
import AddonService from "../service/addon.service";

const mapUser = (user: Partial<User> & { id: string }): User => ({
	// falsy checking
	id: user.id,
	username: user.username || "",
	uuid: user.uuid || "",
	roles: user.roles || [],
	media: user.media,
	anonymous: user.anonymous || false,
});

export default class UserFirestormRepository implements UserRepository {
	async getNameById(id: string): Promise<Username> {
		const res = await users.get(id);
		return {
			id: res.id,
			username: res.anonymous ? undefined : res.username,
			uuid: res.anonymous ? undefined : res.uuid,
		};
	}

	getRaw(): Promise<Record<string, User>> {
		return users.readRaw();
	}

	async getNames(): Promise<Usernames> {
		const fields = await users.select({ fields: ["id", "username", "uuid", "anonymous"] });
		return Object.values(fields).map(({ id, username, uuid, anonymous }) => {
			if (anonymous) return { id };
			return { id, username, uuid };
		});
	}

	async getUserById(id: string): Promise<User> {
		try {
			const user = await users.get(id);
			return mapUser(user);
		} catch (err: unknown) {
			if (err instanceof AxiosError && err.response?.status === 404) {
				// prettier error message
				const formattedError = new NotFoundError("User not found");
				throw formattedError;
			}
			throw err;
		}
	}

	async getProfileOrCreate(discordUser: APIUser): Promise<User> {
		const { id, global_name } = discordUser;
		let user: User;
		try {
			user = await users.get(id);
		} catch (err: unknown) {
			// create if failed with 404
			if (err instanceof AxiosError && err.response?.status === 404) {
				const empty: User = {
					id,
					anonymous: false,
					roles: [],
					// use discord username as default username (can be changed later in webapp)
					username: global_name || "",
					uuid: "",
					media: [],
				};
				await users.set(id, empty);
				user = await users.get(id);
				// non-get related error, throw
			} else throw err;
		}
		return mapUser(user);
	}

	async getUsersByName(name: string): Promise<Users> {
		if (!name) throw new Error("A name must be provided");

		const arr = await users.search([
			{
				field: "username",
				criteria: name.length < 3 ? "==" : "includes",
				value: name,
				ignoreCase: true,
			},
		]);
		return arr.map(mapUser);
	}

	async getUsersFromRole(role: string, username?: string): Promise<Users> {
		if (role === "all" && !username) return Object.values(await users.readRaw());
		const options: SearchOption<User>[] = [];

		if (role !== "all")
			options.push({
				field: "roles",
				criteria: "array-contains",
				value: role,
				ignoreCase: true,
			});

		if (username)
			options.push({
				field: "username",
				criteria: "includes",
				value: username,
				ignoreCase: true,
			});

		const arr = await users.search(options);
		return arr.map(mapUser);
	}

	async changeUserID(oldID: string, newID: string): Promise<WriteConfirmation> {
		const user = await users.get(oldID);
		user[ID_FIELD] = newID;
		users.set(newID, user);

		// replace user's contributions
		const rawContributions = await contributions.readRaw();
		await contributions.editFieldBulk(
			Object.values(rawContributions)
				.filter((c) => c.authors.includes(oldID))
				.map((c) => ({
					id: c[ID_FIELD],
					field: "authors",
					operation: "set",
					// replace old user with new user and remove duplicates
					value: Array.from(
						new Set(c.authors.map((author) => (author === oldID ? newID : author))),
					),
				})),
		);

		// replace user's addons
		const rawAddons = await addons.readRaw();
		await addons.editFieldBulk(
			Object.values(rawAddons)
				.filter((a) => a.authors.includes(oldID))
				.map((a) => ({
					id: a[ID_FIELD],
					field: "authors",
					operation: "set",
					// replace old user with new user and remove duplicates
					value: Array.from(
						new Set(a.authors.map((author) => (author === oldID ? newID : author))),
					),
				})),
		);

		// remove user after set succeeds (prevent accidentally deleting user)
		return users.remove(oldID);
	}

	getRoles(): Promise<string[]> {
		return users.values({ field: "roles", flatten: true });
	}

	async getContributionsById(id: string): Promise<Contributions> {
		const u = await users.get(id);
		return u.contributions();
	}

	async getAddonsById(id: string): Promise<Addons> {
		const u = await users.get(id);
		return u.addons();
	}

	async getAddonsApprovedById(id: string): Promise<Addons> {
		const arr = await this.getAddonsById(id);
		return arr.filter((el) => el.approval.status === "approved");
	}

	async update(id: string, user: UserCreationParams): Promise<User> {
		await users.set(id, user);
		return this.getUserById(id);
	}

	async remove(id: string): Promise<WriteConfirmation[]> {
		const rawAddons = await addons.readRaw();
		const { addonsToTransfer, addonsToDelete } = Object.values(rawAddons)
			.filter((a) => a.authors.includes(id))
			.reduce<{ addonsToTransfer: Addons; addonsToDelete: Addons }>(
				(acc, cur) => {
					// delete addons that are only owned by the deleted user
					if (cur.authors.length === 1) acc.addonsToDelete.push(cur);
					// remove user from addons with multiple authors
					else acc.addonsToTransfer.push(cur);
					return acc;
				},
				{ addonsToTransfer: [], addonsToDelete: [] },
			);

		const proms: Promise<WriteConfirmation>[] = [users.remove(id)];
		if (addonsToTransfer.length)
			proms.push(
				addons.editFieldBulk(
					addonsToTransfer.map((a) => ({
						id: a[ID_FIELD],
						field: "authors",
						operation: "set",
						value: a.authors.filter((c) => c !== id),
					})),
				),
			);

		if (addonsToDelete.length) {
			// need to delete with service to remove files
			const service = new AddonService();
			await Promise.all(addonsToDelete.map((a) => service.remove(a[ID_FIELD])));
		}

		// [remove user, transfer addons]
		return Promise.all(proms);
	}

	async getUserProfiles(searchedUsers: string[]): Promise<UserProfile[]> {
		const u = await users.searchKeys(searchedUsers);
		return u.map(({ id, anonymous, username, uuid, media }) => {
			if (anonymous) return { id };
			return { id, username, uuid, media };
		});
	}
}
