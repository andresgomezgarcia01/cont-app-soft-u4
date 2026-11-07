
export function jsonResponse(statusCode, data, requestId = undefined) {
  const headers = {
    "content-type": "application/json"
  };

  if (requestId) {
    headers["x-request-id"] = requestId;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(data)
  };
}

export function successResponse(data, requestId = undefined) {
  return jsonResponse(200, data, requestId);
}

export function errorResponse(error, requestId) {
  const errorBody = {
    error: {
      code: error.code,
      message: error.message,
      request_id: requestId
    }
  };

  if (error.details !== undefined) {
    errorBody.error.details = error.details;
  }

  return jsonResponse(error.statusCode, errorBody, requestId);
}
