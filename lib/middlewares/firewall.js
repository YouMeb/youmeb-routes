'use strict';

module.exports = function (check) {

  if (typeof check !== 'function') {
    throw new Error('\'check\' is not a function');
  }

  return function (req, res, next) {
    check(req, res, function (err, allow) {
      if (err) {
        return next(err);
      }
      if (allow) {
        return next();
      }
      err = new Error('403 Forbidden');
      err.status = 403;
      console.log(err);
      next(err);
    });
  };

};
