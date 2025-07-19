/* eslint-disable @typescript-eslint/no-namespace */

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			PORT: string;
			DEV: string;
			VERBOSE: string;

			FIRESTORM_URL: string;
			FIRESTORM_TOKEN: string;
			DB_IMAGE_ROOT: string;

			// disable cache for dev
			NO_CACHE: string;

			/**
			 * INTEGRATIONS
			 */

			// cloudflare
			CLOUDFLARE_KEY: string;
			CLOUDFLARE_PASSWORD: string;

			// curseforge
			CURSEFORGE_API_KEY: string;

			// discord
			BOT_PASSWORD: string;
			WEBHOOK_URL?: string;

			/**
			 * AUTH PROVIDERS
			 */

			// needs parsing as json
			AUTH_URLS: string;

			// discord
			DISCORD_CLIENT_ID: string;
			DISCORD_CLIENT_SECRET: string;
		}
	}
}

export default null;
