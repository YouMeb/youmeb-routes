'use strict';

module.exports = function (groups, check) {
  if (typeof groups === 'function') {
    check = groups;
    groups = undefined;
  }

  if (typeof check !== 'function') {
    throw new Error('\'check\' is not a function');
  }
  
  var newGroups;

  if (groups) {
    newGroups = {};

    Object.keys(groups).forEach(function scan(name) {
      if (groups[name]) {
        return newGroups[name] = [];
      }
      var data = [];
      (typeof groups[name] === 'string' ? [name] : group).forEach(function (group) {
        if (!newGroups.hasOwnProperty(group)) {
          scan(group);
        }
        data = data.concat(newGroups[group]);
        data.push(group);
      });
      newGroups[name] = data;
    });
  }

  return function (req, res, next) {
    req.groups = newGroups;
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
