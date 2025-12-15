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
import * as UserRepo from "../repository/user.repository";

export default class UserService {
	public getRaw(): Promise<Record<string, User>> {
		return UserRepo.getRaw();
	}

	public async getStats(): Promise<UserStats> {
		return UserRepo.getStats();
	}

	public getNames(): Promise<Usernames> {
		return UserRepo.getNames();
	}

	public getNameById(id: string): Promise<Username> {
		return UserRepo.getNameById(id);
	}

	public getRoles(): Promise<string[]> {
		return UserRepo.getRoles();
	}

	public getUsersFromRole(role: string, username?: string): Promise<Users> {
		return UserRepo.getUsersFromRole(role, username);
	}

	public getUsersByNameOrId(idOrUsername: string): Promise<User | Users> {
		return UserRepo.getUsersByNameOrId(idOrUsername);
	}

	public getUserById(id: string): Promise<User> {
		return UserRepo.getUserById(id);
	}

	public getUsersByName(username: string): Promise<Users> {
		return UserRepo.getUsersByName(username);
	}

	public getContributions(id: string): Promise<Contributions> {
		return UserRepo.getContributionsById(id);
	}

	public getUserProfiles(users: string[]): Promise<UserProfile[]> {
		return UserRepo.getUserProfiles(users);
	}

	public getApprovedAddonsById(id: string): Promise<Addons> {
		return UserRepo.getApprovedAddonsById(id);
	}

	public getAllAddonsById(id: string): Promise<Addons> {
		return UserRepo.getAllAddonsById(id);
	}

	public changeUserID(oldID: string, newID: string): Promise<WriteConfirmation> {
		return UserRepo.changeUserID(oldID, newID);
	}

	public getProfileOrCreate(user: APIUser): Promise<User> {
		return UserRepo.getProfileOrCreate(user);
	}

	public async setProfileById(id: string, body: UpdateUserProfile): Promise<User> {
		return UserRepo.setProfileById(id, body);
	}

	public async setRoles(id: string, roles: string[]): Promise<User> {
		return UserRepo.setRoles(id, roles);
	}

	public update(id: string, user: User): Promise<User> {
		return UserRepo.update(id, user);
	}

	public remove(id: string): Promise<WriteConfirmation[]> {
		return UserRepo.remove(id);
	}
}
