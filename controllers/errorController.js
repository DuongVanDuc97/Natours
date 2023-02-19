const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const message = `Duplicate field: ${Object.keys(
    err.keyValue
  )} (${Object.values(err.keyValue)})`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid Token', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired!', 401);

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // RENDERED WEBSITE
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });

      // Programming or unknown error: don't leak error detail to client
    } else {
      console.error('ERROR:', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
        err,
      });
    }
  }

  // FOR RENDERED WEBSITE
  if (err.isOperational) {
    console.error('ERROR:', err);
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  } else {
    console.error('ERROR:', err);
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: 'Please try again later.',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    // let error = { ...err };
    let error = Object.create(err);
    // Mongoose bad ObjectID
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    // Mongoose duplicate key/fields
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    // Mongoose validation error
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    // JsonWebTokenError
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    // JWT token expires
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, req, res);
  }
};
