function errorHandler(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }
  
    const statusCode =
      Number.isInteger(err.statusCode) &&
      err.statusCode >= 400 &&
      err.statusCode <= 599
        ? err.statusCode
        : 500;
  
    if (statusCode === 500) {
      console.error("Unexpected server error:", err.message);
    }
  
    return res.status(statusCode).json({
      error: {
        message:
          statusCode === 500
            ? "Internal server error"
            : err.message,
      },
    });
  }
  
  module.exports = errorHandler;