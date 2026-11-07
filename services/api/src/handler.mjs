
import { VolcanoRepository } from "./repository.mjs";
import { VolcanoService } from "./service.mjs";

import { getApiConfig } from "../../common/config.mjs";
import { log } from "../../common/logs.mjs";
import {
  successResponse,
  errorResponse
} from "../../common/responses.mjs";

import {
  AppError,
  InternalError
} from "../../common/errors.mjs";

let defaultService;

function getDefaultService() {
  if (!defaultService) {
    const config = getApiConfig();
    const repository = new VolcanoRepository(config.tableName);

    defaultService = new VolcanoService(repository);
  }

  return defaultService;
}

const routes = {
  "GET /items": async (event, service) => {
    return service.getAll({
      limit: event.queryStringParameters?.limit,
      nextToken: event.queryStringParameters?.next_token
    });
  },

  "GET /items/{id}": async (event, service) => {
    return service.getById(event.pathParameters?.id);
  }
};

export async function handler(event, service) {
  const startTime = Date.now();
  const requestId = event.requestContext?.requestId;
  const route = event.routeKey ?? "UNKNOWN";
  let statusCode = 500;
  let errorCode;

  try {
    const routeHandler = routes[route];

    if (!routeHandler) {
      throw new AppError(
        "INVALID_PARAMETER",
        "The requested route is not supported.",
        400
      );
    }

  const activeService = service ?? getDefaultService();
  const data = await routeHandler(event, activeService);
    statusCode = 200;

    return successResponse(data, requestId);
  } catch (error) {
    const appError = error instanceof AppError ? error : new InternalError();
    statusCode = appError.statusCode;
    errorCode = appError.code;

    return errorResponse(appError, requestId);
  }
  finally {
    const logFields = {
      service: "api",
      correlation_id: requestId,
      route,
      status: statusCode,
      duration_ms: Date.now() - startTime,
    };

    if (errorCode) {
      logFields.error_code = errorCode;
    }

    log(
      statusCode >= 400 ? "ERROR" : "INFO",
      statusCode >= 400 ? "request_failed" : "request_completed",
      { awsRequestId: requestId },
      logFields,
    );
  }
}
