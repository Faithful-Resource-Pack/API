import { Request as ExRequest } from "express";
import { NotFoundError } from "../tools/errorTypes";

// REDIRECT URL IS '<origin>/auth/<provider>/callback/<target>'
const REDIRECT_URI_PATHNAME = "/callback/";
// example with discord provider:
// REDIRECT URL IS '<origin>/auth/discord/callback'

export default class AuthService {
	rawTargetToURL(target: string): string {
		const url: string = JSON.parse(process.env.AUTH_URLS)[target];
		if (!url) throw new NotFoundError("Target not found!");
		return url;
	}

	targetToURL(target: string): string {
		return this.rawTargetToURL(target).replace(/\/$/, "");
	}

	getRedirectURI(request: ExRequest, target: string): string {
		const apiOrigin = this.targetToURL("api");
		const requestPath = request.path;
		const pathSplit = requestPath.split("/");
		pathSplit.pop(); // remove target
		return `${apiOrigin}${pathSplit.join("/")}${REDIRECT_URI_PATHNAME}${target}`;
	}
}
