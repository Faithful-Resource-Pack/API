import { Addons, Contributions, UserNames, User, Users, UserRepository, UserCreationParams } from "../interfaces";
import UserFirestormRepository from "../repository/firestorm/user.repository";

export class UserService {
	private repository: UserRepository = new UserFirestormRepository();

	public getRaw(): Promise<Users> {
		return this.repository.getRaw();
	}

	public getNames(): Promise<UserNames> {
		return this.repository.getNames();
	}

	public getRoles(): Promise<Array<string>> {
		return this.repository.getRoles();
	}

	public getUsersFromRole(role: string, username?: string): Promise<Users> {
		return this.repository.getUsersFromRole(role, username);
	}

	public getUserById(id: string): Promise<User> {
		return this.repository.getUserById(id);
	}

	public getUsersByName(username: string): Promise<Users> {
		return this.repository.getUsersByName(username);
	}

	public getContributions(id: string): Promise<Contributions> {
		return this.repository.getContributionsById(id);
	}

	public getAddons(id: string): Promise<Addons> {
		return this.repository.getAddonsApprovedById(id);
	}

	public getAllAddons(id: string): Promise<Addons> {
		return this.repository.getAddonsById(id);
	}

	//! We don't make verifications here, it's in the controllers

	public async setRoles(id: string, roles: string[]) {
		const user = await this.getUserById(id);
		user.roles = roles;
		return this.update(id, user);
	}

	public async create(id: string, user: User): Promise<User> {
		return this.repository.update(id, user);
	}

	public async update(id: string, user: User): Promise<User> {
		return this.repository.update(id, user);
	}

	public delete(id: string): Promise<void> {
		return this.repository.delete(id);
	}
}
