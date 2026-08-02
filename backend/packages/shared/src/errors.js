const createHttpError = require('http-errors');

const createNotFoundHandler = () => (req, res, next) => {
  next(createHttpError(404, 'Resource not found'));
};

const formatValidationErrors = (errors = []) =>
  errors.map((err) => ({
    field: err.param || err.path,
    message: err.msg || err.message || 'Invalid value'
  }));

const createErrorHandler = (logger) => (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  if (logger) {
    const log = statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    log(err.message, {
      stack: err.stack,
      status: statusCode,
      path: req.originalUrl,
      method: req.method,
      requestId: req.id
    });
  }

  const payload = {
    success: false,
    error:
      statusCode >= 500
        ? 'Something went wrong. Please try again.'
        : err.message || 'Request could not be completed',
    requestId: req.id
  };

  if (err.errors) {
    payload.validation = formatValidationErrors(err.errors);
  }

  res.status(statusCode).json(payload);
};

module.exports = {
  createNotFoundHandler,
  createErrorHandler,
  formatValidationErrors
};
