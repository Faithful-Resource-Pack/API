import "dotenv/config";

import status from "statuses";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import swaggerUi from "swagger-ui-express";
import { ValidateError } from "tsoa";
import responseTime from "response-time";
import cors from "cors";
import apiErrorHandler from "api-error-handler";
import { RegisterRoutes } from "../build/routes";
import { ApiError } from "./v2/tools/ApiError";
import formatSwaggerDoc from "./v2/tools/swagger";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, writeFileSync } from "fs";

const NO_CACHE = process.env.NO_CACHE === "true";
const PORT = process.env.PORT || 8000;

// TODO: find out what the fuck we are doing
const app = express()
	.disable("x-powered-by")
	.use(
		// Use body parser to read sent json payloads
		//! DO NOT DELETE THE BODY PARSER, IT IS USED TO AGGREGATE DATA AND TRANSFORM IT
		//! SPENT 2 HOURS ON THIS SHIT
		bodyParser.json(),
		bodyParser.urlencoded({
			extended: true,
		}),
		//! DO NOT DELETE
		responseTime(),
		express.static("public", {
			extensions: ["html", "xml", "json"],
		}),
		cors({
			origin: "*",
			allowedHeaders: ["discord", "content-type"],
		}),
		apiErrorHandler(),
	);

// start process
app.listen(PORT, () => {
	console.log(`Using database at ${process.env.FIRESTORM_URL}`);
	console.log(`API started at http://localhost:${PORT}`);
	if (NO_CACHE) console.log("Cache is disabled!");
});

// show deprecation for v1 API
app.all("/v1/*", (_req, res) => {
	res.status(410).json({
		message: "API v1 has been discontinued. Please switch to API v2 for all new endpoints.",
	});
});

// API stat log middleware
const LOG_PATH = join(process.cwd(), "log.json");
if (!existsSync(LOG_PATH)) {
	console.log(`Creating log file at ${LOG_PATH}`);
	writeFileSync(LOG_PATH, "{}");
}
app.use((req, _res, next) => {
	next();
	if (!req.url.startsWith("/v2")) return;
	readFile(LOG_PATH, { encoding: "utf8" })
		.then((str) => JSON.parse(str))
		.then((data) => ({
			...data,
			[req.url]: (data[req.url] || 0) + 1,
		}))
		.then((data) => writeFile(LOG_PATH, JSON.stringify(data)));
});

// start v2 api
RegisterRoutes(app);

// redirect docs
app.get("/", (_req, res) => res.redirect("/docs"));

// serve docs
app.use(
	"/docs",
	swaggerUi.serve,
	swaggerUi.setup(
		formatSwaggerDoc(app, "./public/swagger.json"),
		// @types/swagger-ui-express isn't updated and complains
		{
			customCssUrl: "/custom.css",
			customJs: ["/custom.js", "/custom_dom.js"],
			swaggerOptions: {
				tryItOutEnabled: true,
			},
			customfavIcon: "https://database.faithfulpack.net/images/branding/site/favicon.ico",
			customSiteTitle: "Faithful API",
		} as any,
	),
);

// handle errors
app.use((err: any, req: Request, res: Response, next: NextFunction): Promise<void> => {
	let code: number;
	if (err instanceof ValidateError) {
		console.error("ValidateError", err);
		console.warn(
			`Caught Validation Error for ${req.path}: ${JSON.stringify(err.fields)}`,
			err.fields,
		);

		code = 422;

		res.status(422).json({
			message: "Validation Failed",
			details: err?.fields,
		});
		return;
	}
	if (err) {
		if (err.isAxiosError)
			console.error("axios error: body, headers, err", req.body, req.headers, err);
		code =
			Number(
				(typeof err.status === "number" ? err.status : err.statusCode) ||
					(err.response ? err.response.status : err.code),
			) || 400;
		const message =
			(err.response && err.response.data
				? err.response.data.error || err.response.data.message
				: err.message) || err;
		const stack = process.env.VERBOSE && err.stack ? err.stack : "";

		if (process.env.VERBOSE === "true") {
			console.error("code, message, stack", code, message, stack);
		}

		let name = err?.response?.data?.name || err.name;

		if (!name) {
			try {
				name = status(code).replace(/ /g, "");
			} catch {
				// you tried your best, we don't blame you
			}
		}

		const finalError = new ApiError(name, code, message);

		// modify error to give more context and details with data
		let modified: {
			name: string;
			message: string;
		};

		if (err?.response?.data !== undefined) {
			modified = {
				name: finalError.name,
				message: finalError.message,
			};
			finalError.name += `: ${finalError.message}`;
			finalError.message = err.response.data;
		}

		// unmodify error to hide details returned as api response
		if (modified !== undefined) {
			finalError.name = modified.name;
			finalError.message = modified.message;
		}

		// i hate the stack in api response
		delete finalError.stack;

		apiErrorHandler()(finalError, req, res, next);
		res.end();
		return;
	}

	next();
});
