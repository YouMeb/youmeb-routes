'use strict';

module.exports = Route;

function Route(opts) {
  var that = this;

  opts = opts || {};

  opts.path = opts.path || '';
  opts.name = opts.name || '';
  opts.methods = opts.methods || 'all';
  opts.middlewares = opts.middlewares || [];

  Object.keys(opts).forEach(function (key) {
    that[key] = opts[key];
  });

  if (typeof this.methods === 'string') {
    this.methods = [this.methods];
  }

  if (typeof this.handler !== 'function') {
    this.handler = function (req, res, next) {
      next(new Error('WTF !'));
    };
  }
}
