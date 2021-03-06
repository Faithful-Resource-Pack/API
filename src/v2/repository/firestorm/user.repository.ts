import { users } from "../../firestorm";
import { Addons, Contributions, UserNames, User, Users, UserCreationParams, UserRepository } from "../../interfaces";

// eslint-disable-next-line no-underscore-dangle
function __transformUser(user: any): User {
	return {
		id: user.id,
		username: user.username || "",
		uuid: user.uuid || "",
		roles: user.roles || [],
		media: user.media,
		warns: user.warns || [],
		anonymous: user.anonymous || false,
	};
}

export default class UserFirestormRepository implements UserRepository {
	getRaw(): Promise<Users> {
		return users.read_raw()
			.then((res: any) => Object.values(res))
			.then((arr: Array<User>) => arr.map((el) => __transformUser(el)));
	}

	getNames(): Promise<UserNames> {
		return users.select({ fields: [ "id", "username", "uuid", "anonymous"] })
			.then((obj: any) => Object.values(obj))
			.then((_users: Array<{id: string, username: string, uuid: string, anonymous: boolean}>) => _users.map(el => ({ id: el.id, username: el.anonymous ? undefined : el.username, uuid: el.anonymous ? undefined : el.uuid })))
	}

	getUserById(id: string): Promise<User> {
		return users
			.get(id)
			.then((u) => __transformUser(u))
			.catch((err) => {
				if (err.isAxiosError && err.response && err.response.statusCode === 404) {
					const formattedError = new Error("User not found") as any;
					formattedError.code = 404;

					return Promise.reject(formattedError);
				}

				return Promise.reject(err);
			});
	}

	getUsersByName(name: string): Promise<Users> {
		if (!name || name.length < 3) return Promise.reject(new Error('User search requires at least 3 letters'))

		return users.search([
			{
				field: "username",
				criteria: "includes",
				value: name,
      	ignoreCase: true
			}
		])
			.then((arr: Array<User>) => arr.map((el) => __transformUser(el)));
	}

	getUsersFromRole(role: string, username?: string): Promise<Users> {
		if (role === "all" && !username) return users.read_raw().then((res: any) => Object.values(res));
		const options = []

		if (role !== "all") options.push({
			field: "roles",
			criteria: "array-contains",
			value: role,
			ignoreCase: true
		})

		if (username) options.push({
			field: "username",
			criteria: "includes",
			value: username,
			ignoreCase: true
		})

		return users.search(options)
			.then((arr: Array<User>) => arr.map((el) => __transformUser(el)));
	}

	getRoles(): Promise<Array<string>> {
		return users.select({ fields: ["roles"]})
			.then((obj: any) => Object.values(obj)
				.map((el: {roles: Array<string>, id: string}) => el.roles || []) // get roles or none
				.flat() // flat array
				.filter((el, index, array) => array.indexOf(el) === index) // remove duplicates
			)
	}

	getContributionsById(id: string): Promise<Contributions> {
		return users.get(id).then((u) => u.contributions());
	}

	getAddonsById(id: string): Promise<Addons> {
		return users.get(id).then((u) => u.addons());
	}

	getAddonsApprovedById(id: string): Promise<Addons> {
		return users
			.get(id)
			.then((u) => u.addons())
			.then((arr) => arr.filter((el) => el.approval.status === "approved"));
	}

	addWarn(id: string, warn: string): Promise<User> {
		return users.get(id)
			.then((u: User) => {
				if (u.warns) return users.set(id, { warns: [...u.warns, warn] })
				return users.set(id, { ...u, warns: [warn] })
			})
			.then(() => this.getUserById(id));
	}

	getWarns(id: string): Promise<User['warns']> {
		return users.get(id).then((u) => u.warns);
	}
	
	update(id: string, user: UserCreationParams): Promise<User> {
		return users.set(id, user).then(() => this.getUserById(id));
	}

	delete(id: string): Promise<void> {
		return users.remove(id).then(() => Promise.resolve());
	}
}
