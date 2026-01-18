import "dotenv/config";

import { Request as ExRequest } from "express";
import axios from "axios";
import { APIUser } from "discord-api-types/v10";
import { APIError, NotFoundError, PermissionError } from "./errorTypes";
import UserService from "../service/user.service";
import AddonService from "../service/addon.service";
import PostService from "../service/post.service";
import { Addon, AddonStatusApproved, AddonStatusValues } from "../interfaces";

const userService = new UserService();
const addonService = new AddonService();
const postService = new PostService();

const isSlug = (idOrSlug: string): boolean => !AddonStatusValues.includes(idOrSlug as any);
function getRequestKey(
	{ headers, query }: ExRequest,
	key: string,
	queryAllowed = false,
): string | null {
	if (!headers && !query) return null;
	if (headers[key]) return headers[key] as string;
	if (queryAllowed && query[key]) return query[key] as string;
	return null;
}

// https://tsoa-community.github.io/docs/authentication.html
export async function expressAuthentication(
	request: ExRequest,
	securityName: string,
	scopes: string[] = [],
): Promise<any> {
	// handle public add-ons/posts without a token (for website etc)
	if ("id_or_slug" in request.params && !Array.isArray(request.params.id_or_slug)) {
		const idOrSlug = request.params.id_or_slug;
		if (scopes.includes("addon:approved")) {
			// /v2/addons/approved is public, safe to send
			if (idOrSlug === AddonStatusApproved) return true;

			// it's an addon slug and not a status
			if (isSlug(idOrSlug)) {
				const addon = (await addonService.getAddonFromSlugOrId(idOrSlug))[1];
				if (addon.approval.status === AddonStatusApproved) return true;
			}
		}
		if (scopes.includes("post:approved")) {
			if (idOrSlug === "approved") return true;
			const post = await postService.getByIdOrPermalink(idOrSlug);
			if (post.published === true) return true;
		}
	}

	// securityName will hit the default switch state if it doesn't exist so it's fine here
	const token = getRequestKey(request, securityName, securityName === "discord");

	switch (securityName) {
		case "bot": {
			if (!token) throw new Error("Missing bot token in header");
			if (token === process.env.BOT_PASSWORD) return "Valid bot password";
			throw new Error("Password did not match");
		}
		case "cloudflare": {
			if (!token) throw new Error("Missing CloudFlare token in header");
			if (token === process.env.CLOUDFLARE_PASSWORD) return "Valid CloudFlare password";
			throw new Error("Password did not match");
		}
		case "discord": {
			if (!token) throw new Error("Missing Discord token in header");

			let discordUser: APIUser;
			try {
				discordUser = (
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

			// proven (authentified)
			const discordID = discordUser.id;

			// only scope is login required, good to go
			if (!scopes.length) return discordID;

			// resolve whole user object (needed for user init)
			if (scopes.includes("account:create")) return discordUser;
			if (scopes.includes("account:delete")) {
				// make sure id in request and params match
				if (discordID === request.params.id) return discordID;
				// continue to role check (admins can delete accounts too)
			}

			// check add-on ownership
			if (scopes.includes("addon:own") || scopes.includes("addon:approved")) {
				const idOrSlug = Array.isArray(request.params.id_or_slug)
					? request.params.id_or_slug[0]
					: request.params.id_or_slug;
				if (isSlug(idOrSlug)) {
					const addon: Addon = (await addonService.getAddonFromSlugOrId(idOrSlug))[1];
					if (addon.authors.includes(discordID)) return discordID;
				}
				// if it's a status continue to role checks
			}

			// scopes are roles
			// add dev role when developing stuff only
			if (scopes.length && process.env.DEV.toLowerCase() === "true") scopes.push("Developer");

			const user = await userService.getUserById(discordID).catch<null>(() => null);

			let roles: string[] = user?.roles || [];
			if (!Array.isArray(roles)) roles = [];

			// resolve if role matches
			if (scopes.some((scope) => roles.includes(scope))) return discordID;

			// otherwise throw permission error
			console.error(`[${new Date().toUTCString()}] ${request.method} ${request.path}`);
			console.error(`PermissionError with ${discordID}:`);
			console.error(`Found: ${JSON.stringify(roles)}\nNeeded: ${JSON.stringify(scopes)}`);

			if (scopes.includes("addon:approved") && !("id_or_slug" in request.params)) return undefined;
			throw new PermissionError();
		}
		default: {
			throw new NotFoundError("Invalid security name provided");
		}
	}
}

// saves some type gymnastics to be able to declare it at once
export interface ExRequestWithAuth<T> extends ExRequest {
	user: T;
}
