import { Controller, Swagger } from "tsoa";
import multer from "multer";
import { Application, NextFunction, Response as ExResponse, Request as ExRequest } from "express";
import { readFileSync } from "fs";
import { MulterFile } from "v2/interfaces";
import { AddonChangeController } from "../controller/addonChange.controller";
import { expressAuthentication, ExRequestWithAuth } from "./authentication";
import { BadRequestError } from "./errorTypes";

const MIME_TYPES_ACCEPTED = ["image/gif", "image/png", "image/jpeg"];

const upload = multer({
	limits: {
		fileSize: 3000000, // 3MB
	},
	fileFilter(_req, file, callback) {
		if (MIME_TYPES_ACCEPTED.includes(file.mimetype)) callback(null, true);
		else {
			callback(
				new BadRequestError(
					`Incorrect file mime type provided, ${MIME_TYPES_ACCEPTED.join(" or ")} expected`,
				),
			);
		}
	},
});

function returnHandler(
	response: ExResponse,
	statusCode?: number,
	data?: any,
	headers: Record<string, string | string[] | undefined> = {},
) {
	if (response.headersSent) return;
	Object.keys(headers).forEach((name) => response.set(name, headers[name]));
	if (data && typeof data.pipe === "function" && data.readable && typeof data._read === "function")
		data.pipe(response);
	else if (data !== null && data !== undefined) response.status(statusCode || 200).json(data);
	else response.status(statusCode || 204).end();
}

async function promiseHandler<T>(
	controllerObj: Controller,
	promise: T | Promise<T>,
	response: ExResponse,
	successStatus: number,
	next: NextFunction,
) {
	try {
		const data = await Promise.resolve(promise);
		const statusCode = controllerObj.getStatus() || successStatus;
		const headers = controllerObj.getHeaders();

		returnHandler(response, statusCode, data, headers);
	} catch (error: unknown) {
		next(error);
	}
}

interface SwaggerDocOptions {
	prefix: string;
	security: Record<string, string[]>;
	operationId: string;
	description: string;
}

export function formHandler<T>(
	app: Application,
	url: string,
	controller: Controller,
	method: (this: Controller, param: unknown, file: MulterFile, req: ExRequest) => T,
	swaggerDoc: Swagger.Spec3,
	swaggerDocOptions: SwaggerDocOptions,
): Swagger.Spec3 {
	app.post(
		url,
		async (req: ExRequestWithAuth<string>, _res: ExResponse, next: NextFunction) => {
			req.user = await expressAuthentication(
				req,
				"discord",
				swaggerDocOptions.security.discord,
			).catch((err: unknown) => next(err));
			next();
		},
		upload.single("file"),
		(req: ExRequest, res: ExResponse, next: NextFunction) => {
			try {
				const firstParam = Object.keys(req.params)[0];
				// bind method to controller object
				const promise: T = method.call(controller, req.params[firstParam], req.file, req);
				promiseHandler(controller, promise, res, 200, next);
			} catch (error: unknown) {
				next(error);
			}
		},
	);

	// add doc
	const pathCorrected = url.replace(swaggerDocOptions.prefix, "").replace(/:([A-ZA-z_]+)/, "{$1}");
	swaggerDoc.paths ||= {};
	swaggerDoc.paths[pathCorrected] ||= {};
	swaggerDoc.paths[pathCorrected].post = {
		operationId: swaggerDocOptions.operationId,
		responses: {
			201: {
				description: "File created",
				content: {
					"application/json": {
						schema: {
							$ref: "#/components/schemas/File",
						},
					},
				},
			},
			403: {
				description: "",
				content: {
					"application/json": {
						schema: {
							$ref: "#/components/schemas/PermissionError",
						},
					},
				},
			},
			404: {
				description: "",
				content: {
					"application/json": {
						schema: {
							$ref: "#/components/schemas/NotFoundError",
						},
					},
				},
			},
		},
		description: swaggerDocOptions.description,
		tags: ["Add-on Submissions"],
		security: [swaggerDocOptions.security],
		parameters: [
			{
				description: "ID or slug of the requested add-on",
				in: "path",
				name: "id_or_slug",
				type: "string",
				required: true,
				schema: {
					type: "string",
				},
			},
		],
		requestBody: {
			content: {
				"multipart/form-data": {
					schema: {
						type: "object",
						properties: {
							file: {
								description: "Header file",
								type: "file",
							},
						},
						required: ["file"],
					},
				},
			},
		},
	};

	return swaggerDoc;
}

export default function formatSwaggerDoc(app: Application, path: string) {
	// don't pass it in directly so the object reference isn't mutated
	let swaggerDoc: Swagger.Spec3 = JSON.parse(readFileSync(path, { encoding: "utf8" }));

	// manual things
	const adc = new AddonChangeController();
	const screenDelete = swaggerDoc.paths["/addons/{id_or_slug}/screenshots/{index}"];
	delete swaggerDoc.paths["/addons/{id_or_slug}/screenshots/{index}"];

	const headerDelete = swaggerDoc.paths["/addons/{id_or_slug}/header"].delete;
	delete swaggerDoc.paths["/addons/{id_or_slug}/header"].delete;

	swaggerDoc = formHandler(app, "/v2/addons/:id_or_slug/header", adc, adc.postHeader, swaggerDoc, {
		prefix: "/v2",
		operationId: "PostHeader",
		security: {
			discord: ["addon:own", "administrator"],
		},
		description: "Post header file for addon",
	});
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
				discord: ["addon:own", "administrator"],
			},
			description: "Post screenshot file for addon",
		},
	);
	swaggerDoc.paths["/addons/{id_or_slug}/screenshots/{index}"] = screenDelete;
	return swaggerDoc;
}
