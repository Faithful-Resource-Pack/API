import "dotenv/config";
import "./v2/environment";

import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import swaggerUi from "swagger-ui-express";
import { ValidateError } from "tsoa";
import responseTime from "response-time";
import cors from "cors";
import apiErrorHandler from "api-error-handler";
import { RegisterRoutes } from "../build/routes";
import formatSwaggerDoc from "./v2/tools/swagger";
import handleError from "./v2/tools/handleError";
import { GalleryController } from "./v2/controller/gallery.controller";

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
app.all("/v1/*route", (_req, res) => {
	res.status(410).json({
		message: "API v1 has been discontinued. Please switch to API v2 for all new endpoints.",
	});
});

// purge gallery cache on start (good to prevent huge numbers of cache files sitting there)
if (!NO_CACHE) new GalleryController().purgeCache();

// start v2 api
RegisterRoutes(app);

// redirect docs
app.get("/", (_req, res) => res.redirect("/docs"));

// serve docs
app.use(
	"/docs",
	swaggerUi.serve,
	swaggerUi.setup(formatSwaggerDoc(app, "./public/swagger.json"), {
		customCssUrl: "/custom.css",
		customJs: ["/custom.js", "/customDOM.js"],
		swaggerOptions: {
			tryItOutEnabled: true,
		},
		customfavIcon: "https://database.faithfulpack.net/images/branding/logos/favicon.ico",
		customSiteTitle: "Faithful API",
	}),
);

// handle errors
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
	if (!err) return next();

	// logs and handles errors
	const apiError = handleError(err, req.path, req.method);
	if (err instanceof ValidateError) {
		res
			.status(422)
			.json({
				message: "Validation Failed",
				details: err?.fields,
			})
			.end();
		return;
	}

	apiErrorHandler()(apiError, req, res, next);
	res.end();
});
