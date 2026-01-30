import "dotenv/config";

import axios from "axios";

import { APIUser } from "discord-api-types/v10";
import { Request as ExRequest } from "express";
import { APIError, PermissionError } from "../tools/errorTypes";
import { Addon } from "../interfaces";
import AddonService from "../service/addon.service";
import UserService from "../service/user.service";
import { hasIdOrSlug, isAddonSlug } from "./slug";

const userService = new UserService();
const addonService = new AddonService();

// saves some type gymnastics to be able to declare it at once
export interface ExRequestWithAuth<T> extends ExRequest {
	user: T;
}

/**
 * Try to authenticate with Discord and return the results
 * @param request Incoming Express request
 * @param scopes Discord roles or special scopes
 * @param token Discord token
 * @returns Relevant information if successful, PermissionError if not
 */
export default async function discordAuth(request: ExRequest, scopes: string[], token: string) {
	const discordUser = await getDiscordUser(token);
	const discordID = discordUser.id;

	// only scope is login required, good to go
	if (!scopes.length) return discordID;

	if (await isAddonOwner(request, scopes, discordID)) return discordID;
	// if it's a status continue to role checks

	// resolve whole user object (needed for user init)
	if (scopes.includes("account:create")) return discordUser;
	if (scopes.includes("account:delete")) {
		// make sure id in request and params match
		if (discordID === request.params.id) return discordID;
		// continue to role check (admins can delete accounts too)
	}

	const { allowedRoles, userRoles } = await getRoles(scopes, discordID);

	// resolve it here for better logging (we have access to the role arrays)
	if (allowedRoles.some((scope) => userRoles.includes(scope))) return discordID;

	// otherwise throw permission error
	console.error(`[${new Date().toUTCString()}] ${request.method} ${request.path}`);
	console.error(`PermissionError with ${discordID}:`);
	console.error(`Found: ${JSON.stringify(userRoles)}\nNeeded: ${JSON.stringify(allowedRoles)}`);

	throw new PermissionError();
}

/**
 * Get a discord user's authentication information from their session token
 * @param token Discord session token
 * @returns discord api data about the user
 */
async function getDiscordUser(token: string): Promise<APIUser> {
	try {
		return (
			await axios.get<APIUser>("https://discord.com/api/users/@me", {
				headers: {
					authorization: `Bearer ${token}`,
				},
			})
		).data;
	} catch (err) {
		// re-throw with better details (axios stack traces suck)
		throw new APIError(
			"Discord Error",
			err?.response?.status,
			err?.response?.data?.message || err.message,
		);
	}
}

async function isAddonOwner(request: ExRequest, scopes: string[], discordID: string) {
	if (!hasIdOrSlug(request.params)) return false;
	if (!scopes.includes("addon:own") && !scopes.includes("addon:approved")) return false;
	const idOrSlug = request.params.id_or_slug;
	if (isAddonSlug(idOrSlug)) {
		const addon: Addon = (await addonService.getAddonFromSlugOrId(idOrSlug))[1];
		if (addon.authors.includes(discordID)) return true;
	}
	return false;
}

async function getRoles(scopes: string[], discordID: string) {
	const user = await userService.getUserById(discordID).catch<null>(() => null);

	// scopes are roles
	const allowedRoles = scopes;
	const userRoles: string[] = user?.roles || [];

	// add dev role when developing stuff only
	if (allowedRoles.length && process.env.DEV.toLowerCase() === "true")
		allowedRoles.push("Developer");

	return { allowedRoles, userRoles };
}
