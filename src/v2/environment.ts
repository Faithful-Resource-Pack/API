/* eslint-disable @typescript-eslint/no-namespace */

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			readonly PORT: string;
			readonly DEV: string;
			readonly VERBOSE: string;

			readonly FIRESTORM_URL: string;
			readonly FIRESTORM_TOKEN: string;
			readonly DB_IMAGE_ROOT: string;

			// disable cache for dev
			readonly NO_CACHE: string;

			/**
			 * INTEGRATIONS
			 */

			// cloudflare
			readonly CLOUDFLARE_KEY: string;
			readonly CLOUDFLARE_PASSWORD: string;

			// curseforge
			readonly CURSEFORGE_API_KEY: string;

			// discord
			readonly BOT_PASSWORD: string;
			readonly WEBHOOK_URL?: string;

			/**
			 * AUTH PROVIDERS
			 */

			// needs parsing as json
			readonly AUTH_URLS: string;

			// discord
			readonly DISCORD_CLIENT_ID: string;
			readonly DISCORD_CLIENT_SECRET: string;
		}
	}
}

export default null;
