class ApiResponse {
  constructor(success, data = null, message = null, statusCode = 200) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

class SuccessResponse extends ApiResponse {
  constructor(data, message = "Operation Successful", statusCode = 200) {
    super(true, data, message, statusCode);
  }
}

class ErrorResponse extends ApiResponse {
  constructor(message = "Error Occurred", statusCode = 500, errors = null) {
    super(false, null, message, statusCode);
    if (errors) {
      this.errors = errors;
    }
  }
}

class PaginatedResponse extends SuccessResponse {
  constructor(data, pagination, message = "Data retrieved successfully") {
    super(data, message);
    this.pagination = pagination;
  }
}

// Response builder fonksiyonları
const responseWrapper = {
  success: (res, data, message = "Operation Successful", statusCode = 200) => {
    const response = new SuccessResponse(data, message, statusCode);
    return res.status(statusCode).json(response);
  },

  created: (res, data, message = "Record created successfully") => {
    const response = new SuccessResponse(data, message, 201);
    return res.status(201).json(response);
  },

  updated: (res, data, message = "Update Successful") => {
    const response = new SuccessResponse(data, message, 200);
    return res.status(200).json(response);
  },

  deleted: (res, message = "Delete Successful") => {
    const response = new SuccessResponse(null, message, 200);
    return res.status(200).json(response);
  },

  error: (res, message = "Error Occurred", statusCode = 500, errors = null) => {
    const response = new ErrorResponse(message, statusCode, errors);
    return res.status(statusCode).json(response);
  },

  badRequest: (res, message = "Bad Request", errors = null) => {
    const response = new ErrorResponse(message, 400, errors);
    return res.status(400).json(response);
  },

  unauthorized: (res, message = "Unauthorized Access") => {
    const response = new ErrorResponse(message, 401);
    return res.status(401).json(response);
  },

  forbidden: (res, message = "You do not have permission for this action") => {
    const response = new ErrorResponse(message, 403);
    return res.status(403).json(response);
  },

  notFound: (res, message = "Record not found") => {
    const response = new ErrorResponse(message, 404);
    return res.status(404).json(response);
  },
  conflict: (res, message = "Conflict") => {
    const response = new ErrorResponse(message, 409);
    return res.status(409).json(response);
  },

  paginated: (
    res,
    data,
    page,
    limit,
    total,
    message = "Data retrieved successfully",
    additionalData
  ) => {
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    const response = new PaginatedResponse(data, pagination, message);
    return res.status(200).json(response);
  },
};

module.exports = responseWrapper;
