import { WriteConfirmation } from "firestorm-db";
import { APIUser } from "discord-api-types/v10";
import { Contribution } from "./contributions";
import { Addon } from "./addons";

export interface Media {
	type: string;
	link: string;
}

export interface UserCreationParams {
	username: string; // username displayed online
	uuid: string; // minecraft profile UUID
	anonymous: boolean; // true if the user is anonymous
	roles: string[]; // discord roles the user has, that can be modified by admin only
}

export interface Username {
	id?: string;
	username?: string;
	uuid?: string;
}

export interface UserProfile {
	id?: string;
	media?: Media[];
	username?: string;
	uuid?: string;
	bio?: string;
}

export interface UpdateUserProfile extends UserProfile {
	anonymous: boolean;
}

export interface User extends UserCreationParams {
	id: string; // discord user id
	bio?: string;
	media?: Media[];
}

export interface UserStats {
	total: number;
	total_anonymous: number;
	total_roles: number;
	total_per_roles: Record<string, number>;
}

export interface FirestormUser extends User {
	contributions(): Promise<Contribution[]>;
	addons(): Promise<Addon[]>;
}

export interface UserRepository {
	getProfileOrCreate(discordUser: APIUser): Promise<User>;
	getUserProfiles(authors: string[]): Promise<UserProfile[]>;
	getNameById(id: string): Promise<Username>;
	getRaw(): Promise<Record<string, User>>;
	getNames(): Promise<Username[]>;
	getUserById(id: string): Promise<User>;
	getUsersByName(name: string): Promise<User[]>;
	getContributionsById(id: string): Promise<Contribution[]>;
	getAddonsApprovedById(id: string): Promise<Addon[]>;
	getAddonsById(id: string): Promise<Addon[]>;
	update(id: string, user: User): Promise<User>;
	remove(id: string): Promise<WriteConfirmation[]>;
	getUsersFromRole(role: string, username?: string): Promise<User[]>;
	getRoles(): Promise<User["roles"]>;
}
