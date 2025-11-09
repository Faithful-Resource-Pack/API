import { WriteConfirmation } from "firestorm-db";
import { APIUser } from "discord-api-types/v10";
import { Contributions } from "./contributions";
import { Addons } from "./addons";

export interface Media {
	type: string;
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
	id?: string;
	username?: string;
	uuid?: string | undefined;
}

export type Usernames = Username[];

export interface UserProfile {
	id?: string;
	media?: Media[];
	username?: string | undefined;
	uuid?: string | undefined;
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

