import { Request as ExRequest } from "express";

import { AddonStatusApproved, AddonStatusValues } from "../interfaces";
import AddonService from "../service/addon.service";
import PostService from "../service/post.service";

const addonService = new AddonService();
const postService = new PostService();

/**
 * Check if an incoming Express request is to a public post/addon slug endpoint
 * @param request Incoming Express request
 * @param scopes Security scopes to check against
 * @returns Whether the request is to a public post/addon slug
 */
export default async function isPublicSlug(request: ExRequest, scopes: string[]): Promise<boolean> {
	// optimization
	if (!hasIdOrSlug(request.params)) return false;

	const idOrSlug = request.params.id_or_slug;
	if (scopes.includes("addon:approved")) {
		// /v2/addons/approved is public, safe to send
		if (idOrSlug === AddonStatusApproved) return true;

		// it's an addon slug and not a status
		if (isAddonSlug(idOrSlug)) {
			const addon = (await addonService.getAddonFromSlugOrId(idOrSlug))[1];
			if (addon.approval.status === AddonStatusApproved) return true;
		}
	}
	if (scopes.includes("post:approved")) {
		// same thing, /v2/posts/approved is safe
		if (idOrSlug === "approved") return true;
		const post = await postService.getByIdOrPermalink(idOrSlug);
		if (post.published === true) return true;
	}
	return false;
}

type ParamsWithSlug = { id_or_slug: string } & ExRequest["params"];

export const hasIdOrSlug = (params: ExRequest["params"]): params is ParamsWithSlug =>
	"id_or_slug" in params && !Array.isArray(params.id_or_slug);

export const isAddonSlug = (idOrSlug: string): boolean =>
	!AddonStatusValues.includes(idOrSlug as any);
