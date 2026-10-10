function successResponse(res, statusCode, payload) {
  return res.status(statusCode).json({ success: true, ...payload });
}

function errorResponse(res, statusCode, message, details = null) {
  const response = { success: false, message };
  if (details) response.details = details;
  return res.status(statusCode).json(response);
}

module.exports = { successResponse, errorResponse };
