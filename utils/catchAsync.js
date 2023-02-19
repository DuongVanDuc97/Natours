module.exports = (fn) => {
  // Actual function that Express calls when the route is activate
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err));
  };
};
