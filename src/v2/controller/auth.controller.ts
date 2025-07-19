import { Request as ExRequest } from "express";
import { BodyProp, Controller, Get, Path, Post, Query, Request, Route, Tags } from "tsoa";
import { RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";
import AuthService from "../service/auth.service";

@Route("auth")
@Tags("Auth")
export class AuthController extends Controller {
	private readonly service = new AuthService();

	/**
	 * Redirects to Discord oauth2 authorization page
	 * @param target Redirect target app
	 */
	@Get("discord/{target}")
	public discordAuthGrant(@Path() target: string, @Request() request: ExRequest) {
		const redirectURI = this.service.getRedirectURI(request, target);

		const params = new URLSearchParams();
		params.append("client_id", process.env.DISCORD_CLIENT_ID);
		params.append("response_type", "code");
		params.append("scope", "identify");
		params.append("redirect_uri", redirectURI);

		request.res?.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
	}

	/**
	 * Handles Discord authorization page redirect
	 * @param target Where to post the auth (provided in /auth/discord/{target})
	 */
	@Get("discord/callback/{target}")
	public async discordAuthCallback(
		@Request() request: ExRequest,
		@Path() target: string,
		@Query() code?: string,
	) {
		// when you press cancel on the discord screen
		if (!code) return request.res?.redirect(this.service.targetToURL(target));

		const discordParams = new URLSearchParams();
		discordParams.append("client_id", process.env.DISCORD_CLIENT_ID);
		discordParams.append("client_secret", process.env.DISCORD_CLIENT_SECRET);
		discordParams.append("grant_type", "authorization_code");
		discordParams.append("code", code);
		discordParams.append("redirect_uri", `${this.service.targetToURL("api")}${request.path}`);
		discordParams.append("scope", "identify");

		const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			body: discordParams,
		});

		const json = (await tokenResponse.json()) as RESTPostOAuth2AccessTokenResult;

		if ("error" in json) {
			request.res?.status(500).json(json).end();
			return;
		}

		const targetParams = new URLSearchParams();
		targetParams.append("access_token", json.access_token);
		targetParams.append("refresh_token", json.refresh_token);
		targetParams.append("expires_in", String(json.expires_in));
		request.res?.redirect(`${this.service.targetToURL(target)}?${targetParams.toString()}`);
	}

	/**
	 * Handles Discord refresh for new sessions
	 */
	@Post("discord/refresh")
	public async discordAuthRefresh(
		// use body prop since we only need the one key
		@BodyProp() refresh_token: string,
		@Request() request: ExRequest,
	) {
		const params = new URLSearchParams();
		params.append("client_id", process.env.DISCORD_CLIENT_ID);
		params.append("client_secret", process.env.DISCORD_CLIENT_SECRET);
		params.append("grant_type", "refresh_token");
		params.append("refresh_token", refresh_token);

		const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			body: params,
		});

		const json = (await tokenResponse.json()) as RESTPostOAuth2AccessTokenResult;

		if ("error" in json) {
			request.res?.status(500).json(json).end();
			return;
		}

		request.res?.json(json).end();
	}
}
