const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  let url = `${req.protocol}://127.0.0.1:3000/me`;
  if (process.env.NODE_ENV === 'production') {
    url = `${req.protocol}://${req.get('host')}/me`;
  }
  // const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.isCorrectPassword(password))) {
    return next(new AppError('Incorrect email or password'), 401);
  }

  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('Please log in to get access', 401));
  }
  // verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(
      new AppError('The user belong to this token no longer exist!', 401)
    );
  }
  // check if user changed password after the token was issued
  if (user.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please login again!')
    );
  }

  req.user = user;
  res.locals.user = user;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action!', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('User does not exist!', 404));
  }

  const resetToken = user.createPasswordResetToken();
  user.save({ validateModifiedOnly: true });

  // send reset token to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token',
    //   message,
    // });

    new Email(user, resetURL).sendPasswordReset();

    res.status(204).json({
      status: 'No content',
      message: 'Token sent to your email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.save({ validateModifiedOnly: true });

    return next(
      new AppError('There was an error sending email. Try again later', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired'));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateModifiedOnly: true });

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!user.isCorrectPassword(req.body.currentPassword)) {
    return next(new AppError('Your current password is wrong', 401));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save({ validateModifiedOnly: true });

  createSendToken(user, 200, res);
});

// Only for rendered page
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    if (req.cookies.jwt === 'loggedout') return next();
    // verify token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    );
    // check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next();
    }
    // check if user changed password after the token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    res.locals.user = user;
    return next();
  }
  next();
});
