const createHttpError = require('http-errors');
const jwt = require('jsonwebtoken');

const authenticateRequest = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET environment variable is not defined');
  }

  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(createHttpError(401, 'Authorization token missing'));
    }

    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, secret);
      req.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email
      };
      return next();
    } catch (error) {
      return next(createHttpError(401, 'Invalid or expired token'));
    }
  };
};

module.exports = {
  authenticateRequest
};
