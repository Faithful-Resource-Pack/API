export class APIError extends Error {
	readonly statusCode: number;

	constructor(name: string, statusCode: number, message?: string) {
		super(message);
		this.name = name;
		this.statusCode = statusCode;
	}
}

export class BadRequestError extends APIError {
	constructor(message?: string) {
		super("BadRequest", 400, message);
	}
}

export class NotFoundError extends APIError {
	constructor(message?: string) {
		super("NotFound", 404, message);
	}
}

export class NotAvailableError extends APIError {
	constructor(message?: string) {
		super("ResourceNotAvailableYet", 408, message);
	}
}

export class ForbiddenError extends APIError {
	constructor(message?: string) {
		super("Forbidden", 403, message);
	}
}

export class PermissionError extends ForbiddenError {
	constructor() {
		super("You don't have the permission to do that!");
	}
}
