import status from "statuses";
import * as firestorm from "firestorm-db";
import express, { Application, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import swaggerUi, { SwaggerUiOptions } from "swagger-ui-express";
import { ValidateError } from "tsoa";
import responseTime from "response-time";
import cors from "cors";

import * as dotenv from "dotenv";
import apiErrorHandler from "api-error-handler";
import sendError from "./errorSender";
import { RegisterRoutes } from "../build/routes";
import { ApiError } from "./v2/tools/ApiError";
import { AddonChangeController } from "./v2/controller/addonChange.controller";
import formHandler from "./v2/tools/FormHandler";

dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEV = (process.env.DEV || "false") === "true";
const NO_CACHE = process.env.NO_CACHE === 'true';
const PORT = process.env.PORT || 8000;
const BOT_ENDPOINT = process.env.DISCORD_BOT_ENDPOINT;

firestorm.address(process.env.FIRESTORM_URL);
firestorm.token(process.env.FIRESTORM_TOKEN);

const app: Application = express();

// Use body parser to read sent json payloads
//! DO NOT DELETE THE BODY PARSER, IT IS USED TO AGGREGATE DATA AND TRANSFORM IT
//! SPENT 2 HOURS ON THIS SHIT
app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: true,
	})
);
//! DO NOT DELETE

app.use(responseTime());

app.use(
	express.static("public", {
		extensions: ["html", "xml", "json"],
	})
);

app.get("/", (req, res) => {
	res.redirect("/docs");
});

app.use(
	cors({
		origin: "*",
		allowedHeaders: ["discord", "content-type"],
	})
);

const options: SwaggerUiOptions = {
	customCssUrl: "/custom.css",
	customJs: "/custom.js",
	swaggerOptions: {
		tryItOutEnabled: true,
	},
	customfavIcon:
		"https://database.faithfulpack.net/images/branding/site/favicon.ico",
	customSiteTitle: "Faithful API",
};

app.listen(PORT, () => {
	console.log(`DB is located at ${process.env.FIRESTORM_URL}`);
	console.log(`Server is running at http://localhost:${PORT}`);
	console.log(`Bot endpoint is set at ${BOT_ENDPOINT}`);
	if(NO_CACHE) console.log(`Started with no cache`);
});

app.use(apiErrorHandler());

RegisterRoutes(app);

let swaggerDoc = require("../public/swagger.json");

// manual things
const adc = new AddonChangeController();
const screenDelete =
	swaggerDoc.paths["/addons/{id_or_slug}/screenshots/{index}"];
const headerDelete = swaggerDoc.paths["/addons/{id_or_slug}/header"].delete;
delete swaggerDoc.paths["/addons/{id_or_slug}/screenshots/{index}"];
delete swaggerDoc.paths["/addons/{id_or_slug}/header"].delete;
swaggerDoc = formHandler(
	app,
	"/v2/addons/:id_or_slug/header",
	adc,
	adc.postHeader,
	swaggerDoc,
	{
		prefix: "/v2",
		operationId: "PostHeader",
		security: {
			discord: ["addon:own"],
		},
		description: "Post header file for addon",
	}
);
swaggerDoc.paths["/addons/{id_or_slug}/header"].delete = headerDelete;

swaggerDoc = formHandler(
	app,
	"/v2/addons/:id_or_slug/screenshots",
	adc,
	adc.addonAddScreenshot,
	swaggerDoc,
	{
		prefix: "/v2",
		operationId: "PostScreenshot",
		security: {
			discord: ["addon:own"],
		},
		description: "Post screenshot file for addon",
	}
);
swaggerDoc.paths["/addons/{id_or_slug}/screenshots/{index}"] = screenDelete;

// // TODO: find out what the fuck we are doing
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc, options));

const v1 = require("./v1");

app.use("/v1", v1);

app.use(
	async (
		err: any,
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		let code = null;
		if (err instanceof ValidateError) {
			console.error("ValidateError", err);
			const warn = `Caught Validation Error for ${req.path}: ${JSON.stringify(
				err.fields
			)}`;
			console.warn(warn, err.fields);

			code = 422;
			await sendError(code, err, req, Error().stack, warn);

			res.status(422).json({
				message: "Validation Failed",
				details: err?.fields,
			});
			return;
		}
		if (err) {
			if (err.isAxiosError)
				console.error(
					"axios error: body, headers, err",
					req.body,
					req.headers,
					err
				);
			code =
				parseInt(
					(typeof err.status === "number" ? err.status : err.statusCode) ||
						(err.response ? err.response.status : err.code),
					10
				) || 400;
			const message =
				(err.response && err.response.data
					? (err.response.data.error || err.response.data.message)
					: err.message) || err;
			const stack = process.env.VERBOSE && err.stack ? err.stack : "";

			if (process.env.VERBOSE === "true") {
				console.error("code, message, stack", code, message, stack);
			}

			let name = err?.response?.data?.name || err.name;

			if (!name) {
				try {
					name = status(code).replace(/ /, "");
				} catch (error) {
					// you tried your best, we don't blame you
				}
			}

			const finalError = new ApiError(name, code, message);

			// modify error to give more context and details with data
			let modified: {
				name: string,
				message: string,
			} | undefined;
			if (err?.response?.data !== undefined) {
				modified = {
					name: finalError.name,
					message: finalError.message
				};
				finalError.name += `: ${finalError.message}`;
				finalError.message = err.response.data;
			}

			// send error to bot
			await sendError(code, err, req, stack, message);

			// unmodify error to hide details returned as api response
			if(modified !== undefined) {
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
	}
);
