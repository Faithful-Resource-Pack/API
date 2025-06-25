import { WriteConfirmation } from "firestorm-db";
import { APIUser } from "discord-api-types/v10";
import { Contributions } from "./contributions";
import { Addons } from "./addons";

export interface Media {
	type:
		| "CurseForge"
		| "GitHub"
		| "Modrinth"
		| "Patreon"
		| "Paypal"
		| "Planet Minecraft"
		| "PSN"
		| "Reddit"
		| "Steam"
		| "Twitter"
		| "Website"
		| "Xbox"
		| "YouTube"
		| "Other";
	link: string;
}
export type Medias = Media[];

export interface UserCreationParams {
	username: string; // username displayed online
	uuid: string; // minecraft profile UUID
	anonymous: boolean; // true if the user is anonymous
	roles: string[]; // discord roles the user has, that can be modified by admin only
}

export interface Username {
	id: string;
	username: string;
	uuid: string;
}

export type Usernames = Username[];

export interface UserProfile {
	id?: string;
	media?: Media[];
	username: string | undefined;
	uuid: string | undefined;
}

export interface UpdateUserProfile extends UserProfile {
	anonymous: boolean;
}

export interface User extends UserCreationParams {
	id: string; // discord user id
	media?: Medias;
}

export type Users = User[];

export interface UserStats {
	total: number;
	total_anonymous: number;
	total_roles: number;
	total_per_roles: Record<string, number>;
}

export interface FirestormUser extends User {
	contributions(): Promise<Contributions>;
	addons(): Promise<Addons>;
}

export interface UserRepository {
	getProfileOrCreate(discordUser: APIUser): Promise<User>;
	getUserProfiles(authors: string[]): Promise<UserProfile[]>;
	getNameById(id: string): Promise<Username>;
	getRaw(): Promise<Record<string, User>>;
	getNames(): Promise<Usernames>;
	getUserById(id: string): Promise<User>;
	getUsersByName(name: string): Promise<Users>;
	getContributionsById(id: string): Promise<Contributions>;
	getAddonsApprovedById(id: string): Promise<Addons>;
	getAddonsById(id: string): Promise<Addons>;
	update(id: string, user: User): Promise<User>;
	delete(id: string): Promise<WriteConfirmation>;
	getUsersFromRole(role: string, username?: string): Promise<Users>;
	getRoles(): Promise<User["roles"]>;
}
