import "dotenv/config";

import { Request as ExRequest } from "express";
import { BadRequestError, ForbiddenError } from "../tools/errorTypes";

import discordAuth from "./discord";
import isPublicSlug from "./slug";

type SecurityType = "bot" | "discord" | "cloudflare";

// https://tsoa-community.github.io/docs/authentication.html
export async function expressAuthentication(
	request: ExRequest,
	securityName: SecurityType,
	scopes: string[] = [],
): Promise<any> {
	// handle public add-ons/posts without a token (for website etc)
	if (await isPublicSlug(request, scopes)) return true;

	// securityName will hit the default switch state if it doesn't exist so it's safe to use
	const token = getToken(request, securityName, securityName === "discord");

	switch (securityName) {
		case "bot":
			if (!token) throw new BadRequestError("This endpoint requires a bot token in the header");
			if (token === process.env.BOT_PASSWORD) return true;
			throw new ForbiddenError("Invalid bot token in header");
		case "discord":
			if (!token)
				throw new BadRequestError(
					"This endpoint requires a Discord session token in the request header",
				);
			return discordAuth(request, scopes, token);
		case "cloudflare":
			if (!token)
				throw new Error("This endpoint requires a CloudFlare token in the request header");
			if (token === process.env.CLOUDFLARE_PASSWORD) return true;
			throw new ForbiddenError("Invalid CloudFlare token in header");
		default:
			throw new BadRequestError("Invalid security name provided");
	}
}

// helper function to get the token
function getToken(
	{ headers, query }: ExRequest,
	tokenType: string,
	searchQueryParams = false,
): string | null {
	if (!headers && !query) return null;

	// check if it's a string instead of existing because of some weird type validation issues
	if (typeof headers[tokenType] === "string") return headers[tokenType];
	if (searchQueryParams && typeof query[tokenType] === "string") return query[tokenType];
	return null;
}
