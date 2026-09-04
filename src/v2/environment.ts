/* eslint-disable @typescript-eslint/no-namespace */

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			readonly PORT: string;
			readonly DEV: string;
			readonly VERBOSE: string;
			readonly USE_CACHE: string;

			readonly FIRESTORM_URL: string;
			readonly FIRESTORM_TOKEN: string;
			readonly DB_IMAGE_ROOT: string;

			/**
			 * AUTHENTICATION
			 */

			readonly BOT_PASSWORD: string;
			readonly CLOUDFLARE_PASSWORD: string;

			// needs parsing as json
			readonly AUTH_URLS: string;

			readonly DISCORD_CLIENT_ID: string;
			readonly DISCORD_CLIENT_SECRET: string;

			/**
			 * INTEGRATIONS
			 */

			readonly CLOUDFLARE_KEY: string;
			readonly CURSEFORGE_API_KEY: string;
			readonly WEBHOOK_URL?: string;
		}
	}
}

export default null;
