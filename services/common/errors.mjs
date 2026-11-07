
export class AppError extends Error {
  constructor(code, message, statusCode, details = undefined) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;

    if (details !== undefined) {
      this.details = details;
    }
  }
}

export class InvalidParameterError extends AppError {
  constructor(message, details = undefined) {
    super("INVALID_PARAMETER", message, 400, details);
  }
}

export class InvalidPaginationTokenError extends AppError {
  constructor(message = "The pagination token is invalid.") {
    super("INVALID_PAGINATION_TOKEN", message, 400);
  }
}

export class ItemNotFoundError extends AppError {
  constructor(message = "The requested item was not found.") {
    super("ITEM_NOT_FOUND", message, 404);
  }
}

export class DependencyUnavailableError extends AppError {
  constructor(
    message = "A required service is unavailable.",
    cause = undefined
  ) {
    super("DEPENDENCY_UNAVAILABLE", message, 503);

    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class InternalError extends AppError {
  constructor(message = "An unexpected internal error occurred.") {
    super("INTERNAL_ERROR", message, 500);
  }
}
