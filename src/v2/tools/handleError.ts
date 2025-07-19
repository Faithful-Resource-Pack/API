import { AxiosError } from "axios";
import status from "statuses";
import { APIError } from "./errorTypes";

interface ModifiedError {
	name: string;
	message: string;
}

function getCode(err: Record<string, any>) {
	if (typeof err.status === "number") return err.status;
	if (err.statusCode) return err.statusCode;
	if (err.response) return err.response.status;
	if (err.code) return err.code;
	return 400;
}

function getMessage(err: Record<string, any>) {
	if (err.response && err.response.data)
		return err.response.data.error || err.response.data.message;
	return err.message || err;
}

/**
 * Handle and log errors
 * @param err Error to handle
 * @returns Front-end API error to show user
 */
export default function handleError(err: any, route: string, method: string): APIError {
	const code = Number(getCode(err));
	const message: string | Error = getMessage(err);
	const stack: string = process.env.VERBOSE === "true" && err.stack ? err.stack : "";

	let printed = false;
	// silence post not found errors because they happen really frequently
	if (process.env.VERBOSE === "true" && message !== "Post not found") {
		console.error(`[${new Date().toUTCString()}] ${method} ${route}`);
		// if the message already includes a stack don't print it twice
		if ((message as Error).stack) console.error(`${code}:`, message);
		else console.error(`${code}:`, message, "\n", stack);
		printed = true;
	}
	if (err instanceof AxiosError) {
		console.error("Axios Error: Response:\n", err.response);
		printed = true;
	}
	// print some empty lines between each error so scrolling through logs doesn't give you a migraine
	if (printed) console.error("\n\n");

	let name: string = err?.response?.data?.name || err.name;

	if (!name) {
		try {
			name = status(code).replace(/ /g, "");
		} catch {
			// you tried your best, we don't blame you
			name = "Unknown Error";
		}
	}

	const finalError = new APIError(name, code, message.toString());

	// modify error to give more context and details with data
	let modified: ModifiedError | undefined;

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

	// front-end users don't need the stack
	delete finalError.stack;

	return finalError;
}
