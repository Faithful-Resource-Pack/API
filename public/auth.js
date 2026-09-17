/* eslint-disable no-undef */

/**
 * Swagger pre-auth and auth script for Swagger UI
 * @author TheRolf
 */
const API_KEY = "ApiKey";

function startUntil(func, cond) {
	const it = setInterval(() => {
		if (!cond()) return;

		// if condition true, disable interval
		clearInterval(it);

		// start function
		func();
	}, 20);
}

function getTokens() {
	const value = localStorage.getItem(API_KEY);

	// if new guy, return empty object
	if (!value) return {};

	// try to parse and return value
	try {
		return JSON.parse(value);
	} catch {
		// if not parsed, set empty object
		return {};
	}
}

startUntil(
	() => {
		const originalAuthorize = ui.authActions.authorize;

		// on login
		ui.authActions.authorize = (payload) => {
			const key = Object.keys(payload)[0];

			// get stored keys
			const apiKeys = getTokens();

			// add this one
			apiKeys[key] = payload[key].value;

			// update keys
			localStorage.setItem(API_KEY, JSON.stringify(apiKeys));

			// call original key
			return originalAuthorize(payload);
		};

		// if logout is clicked delete the api key in the local storage
		const originalLogout = ui.authActions.logout;

		// on logout
		ui.authActions.logout = (payload) => {
			const apiTokens = getTokens();

			// delete key if existing
			if (payload[0] in apiTokens) delete apiTokens[payload[0]];

			// update keys
			localStorage.setItem(API_KEY, JSON.stringify(apiTokens));

			// call original key
			return originalLogout(payload);
		};

		// on load
		// load each token,
		// For each existing token, pre auth
		const apiTokens = getTokens();

		const keys = Object.keys(apiTokens);
		keys.forEach((key) => {
			ui.preauthorizeApiKey(key, apiTokens[key]);
		});

		if (keys.length) console.log(`Pre-authed to ${keys.join(", ")}`);
	},
	() => window.ui !== undefined,
);
