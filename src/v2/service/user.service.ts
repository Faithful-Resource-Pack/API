import { WriteConfirmation } from "firestorm-db";
import { APIUser } from "discord-api-types/v10";
import {
	Addons,
	Contributions,
	Usernames,
	User,
	Users,
	UserStats,
	UserProfile,
	Username,
	UpdateUserProfile,
} from "../interfaces";
import UserFirestormRepository from "../repository/user.repository";
import { BadRequestError } from "../tools/errors";

export default class UserService {
	private readonly repo = new UserFirestormRepository();

	public getRaw(): Promise<Record<string, User>> {
		return this.repo.getRaw();
	}

	public async getStats(): Promise<UserStats> {
		const allRoles = [] as string[];
		const users = await this.getRaw();
		return Object.values(users).reduce<UserStats>(
			(acc, user) => {
				acc.total++;
				if (user.anonymous) acc.total_anonymous++;

				user.roles.forEach((role) => {
					if (!allRoles.includes(role)) {
						allRoles.push(role);
						acc.total_roles++;

						acc.total_per_roles[role] = 0;
					}
					acc.total_per_roles[role]++;
				});

				return acc;
			},
			{ total: 0, total_anonymous: 0, total_roles: 0, total_per_roles: {} },
		);
	}

	public getNames(): Promise<Usernames> {
		return this.repo.getNames();
	}

	public getNameById(id: string): Promise<Username> {
		return this.repo.getNameById(id);
	}

	public getRoles(): Promise<string[]> {
		return this.repo.getRoles();
	}

	public getUsersFromRole(role: string, username?: string): Promise<Users> {
		return this.repo.getUsersFromRole(role, username);
	}

	public getUsersByNameOrId(idOrUsername: string): Promise<User | Users> {
		// can't parse discord ids directly into a number because precision can be lost
		const str = idOrUsername.split("");
		const int = str.map((s) => parseInt(s, 10));
		const same = int.every((i, index) => i.toString() === str[index]);

		return same ? this.getUserById(idOrUsername) : this.getUsersByName(idOrUsername);
	}

	public getUserById(id: string): Promise<User> {
		return this.repo.getUserById(id);
	}

	public getUsersByName(username: string): Promise<Users> {
		return this.repo.getUsersByName(username);
	}

	public getContributions(id: string): Promise<Contributions> {
		return this.repo.getContributionsById(id);
	}

	public getUserProfiles(users: string[]): Promise<UserProfile[]> {
		return this.repo.getUserProfiles(users);
	}

	public getAddons(id: string): Promise<Addons> {
		return this.repo.getAddonsApprovedById(id);
	}

	public getAllAddons(id: string): Promise<Addons> {
		return this.repo.getAddonsById(id);
	}

	public changeUserID(oldID: string, newID: string): Promise<WriteConfirmation> {
		return this.repo.changeUserID(oldID, newID);
	}

	public getProfileOrCreate(user: APIUser): Promise<User> {
		return this.repo.getProfileOrCreate(user);
	}

	public async setProfileById(id: string, body: UpdateUserProfile): Promise<void> {
		const user = await this.getUserById(id);

		const username = (body.username || "").trim();
		if (username.length === 0) throw new BadRequestError("Username cannot be empty");

		user.username = username;

		user.uuid = body.uuid;
		user.media = body.media;
		user.anonymous = body.anonymous;

		await this.update(id, user);
	}

	public async setRoles(id: string, roles: string[]): Promise<User> {
		const user = await this.getUserById(id);
		user.roles = roles;
		return this.update(id, user);
	}

	public create(id: string, user: User): Promise<User> {
		return this.repo.update(id, user);
	}

	public update(id: string, user: User): Promise<User> {
		return this.repo.update(id, user);
	}

	public delete(id: string): Promise<WriteConfirmation[]> {
		return this.repo.delete(id);
	}
}
