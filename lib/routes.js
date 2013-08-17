'use strict';

var fs = require('fs');
var path = require('path');
var Controller = require('./controller');

module.exports = Routes;

function Routes(app, opts) {
  this._source = [];

  this.namespace = this.getAttrs({
    path: '',
    name: '',
    middlewares: []
  }, opts || {});

  this.attrs = {
    path: function (path, routePath) {
      return (path || '') + (routePath || '');
    },
    name: function (name, routeName) {
      var arr = [];
      if (name) {
        arr.push(name);
      }
      if (routeName) {
        arr.push(routeName);
      }
      return arr.join('.');
    },
    middlewars: function (middlewares, routeMiddlewares) {
      return (middlewares || []).concat(routeMiddlewares || []);
    }
  };

  this.collection = {};
  this.middlewares = require('./middlewares');
  this.complete = false;
  this.app = app;
}

Routes.create = function (app) {
  return new Routes(app);
};

// 把包含 controller 的目錄加進 routes
Routes.prototype.source = function (dir) {
  var that = this;
  
  if (typeof dir === 'string') {
    this._source.push(dir);
    return this;
  }

  if (dir instanceof Array) {
    Array.prototype.splice.apply(this._source, [this._source.length - 1, 0].concat(dir));
    return this;
  }

  return this;
};

Routes.prototype.getAttrs = function (old, curr) {
  var that = this;
  var attrs = {};

  Object.keys(old).forEach(function (key) {
    attrs[key] = old[key];
  });

  Object.keys(curr).forEach(function (key) {
    var val = curr[key];

    if (that.attrs[key]) {
      val = that.attrs[key](old[key], val);
    }

    attrs[key] = val;
  });

  return attrs;
};

Routes.prototype.addRoutes = function (file, done) {
  var that = this;

  fs.readFile(file, function (err) {
    var controller, wrapper;

    if (err) {
      return done(err);
    }

    try {
      wrapper = require(file);
    } catch (e) {
      return done(e);
    }

    controller = new Controller({
      name: path.basename(file).replace(/\.\w+$/, '')
    });
    controller.$.routes = that;

    if (typeof wrapper !== 'function') {
      return done(null);
    }

    wrapper.call(controller);

    controller.$.getRoutes().forEach(function (route) {
      that.collection[route.name] = route;
    });

    done();

  });
};

Routes.prototype.walk = function (dir, fn, done) {
  var that = this;

  fs.readdir(dir, function (err, files) {
    var i = 0;

    if (err) {
      return done(err);
    }

    (function next() {

      var file = files[i++];

      if (!file) {
        return done(null);
      }

      file = path.join(dir, file);

      fn(file, next);

    })();
  });
};

Routes.prototype.scan = function (source, done) {
  var that = this;
  var i = 0;
  var isJsFileRe = /\.(?:js|coffee|ls)$/;
  var isIndexFileRe = /index\.(?:js(?:on)?|coffee|ls)$/;
  var files = [];
  var directories = [];

  if (typeof source == 'function') {
    done = source;
    source = that._source;
  }

  (function next() {
    var dir = source[i++];
    var index = false;

    if (!dir) {
      return done(null);
    }

    that.walk(dir, function (file, next) {

      fs.stat(file, function (err, stats) {
        if (err) {
          return done(err);
        }

        if (stats.isFile()) {
          if (!isJsFileRe.test(file)) {
            return next();
          }

          if (isIndexFileRe.test(file)) {
            index = true;
            return next();
          }

          files.push(file);

          return next();
        }

        if (stats.isDirectory()) {
          directories.push(file);
          next();
        }
      });

    }, function (err) {

      var opts = {};
      var old = {};
      var j;

      if (err) {
        return done(err);
      }

      if (index) {
        try {
          opts = require(dir);
        } catch (e) {
          return done(e);
        }
      }

      old = that.namespace;
      opts.name = typeof opts.name === 'string' ? opts.name : path.basename(dir);
      that.namespace = that.getAttrs(old, opts);

      j = 0;

      function nextjDone(err) {
        if (err) {
          return done(err);
        }

        that.scan(directories, function (err) {
          if (err) {
            return done(err);
          }
          that.namespace = old;
          next();
        });
      }

      (function nextj() {

        var file = files[j++];

        if (!file) {
          return nextjDone(null);
        }

        that.addRoutes(file, function (err) {
          if (err) {
            return nextjDone(err);
          }
          nextj();
        });
        
      })();

    });
  })();
};

Routes.prototype.middleware = function () {
  var that = this;
  return function (req, res, next) {
    req.$routes = that;
    next();
  };
};

Routes.prototype.addRouteToReq = function (route) {
  return function (req, res, next) {
    req.$route = route;
    next();
  };
};

Routes.prototype.generate = function (done) {
  var that = this;

  this.scan(function (err) {
    if (err) {
      return done(err);
    }

    Object.keys(that.collection).forEach(function (key) {
      var route = that.collection[key];
      var handlers = [that.addRouteToReq(route)];

      route.middlewares.forEach(function (name) {
        handlers.push(that.middlewares[name]);
      });

      handlers.push(route.handler);

      if (!!~route.methods.indexOf('all')) {
        that.app.all(route.path, handlers);
        return;
      }

      route.methods.forEach(function (method) {
        that.app[method](route.path, handlers);
      });
    });

    done();
  });
};

// 設定 route 屬性跟父層合併的方式
// 沒設定的話就直接覆蓋
Routes.prototype.attr = function (name, fn) {
  if (name && typeof fn === 'function') {
    this.attrs[name] = fn;
  }
  this.namespace[name] = fn();
  return this;
};

// 設定 route 可用的 middleware
Routes.prototype.setMiddleware = function (name, middleware, enableForAll) {
  var that = this;

  if (typeof middleware === 'function') {
    this.middlewares[name] = middleware;
    if (enableForAll) {
      this.namespace.middlewares.push('name');
    }
    return this;
  }

  if (typeof middleware === 'object') {
    Object.keys(middleware).forEach(function (key) {
      that.setMiddleware(
        key,
        middleware[key],
        middleware[key].enableForAll === undefined ?
          middleware[key].enableForAll :
          enableForAll
      );
    });
    return this;
  }

  return this;
};

Routes.prototype.useFirewall = function (fn) {
  this.middlewares['firewall'] = this.middlewares['firewall'](fn);
  this.namespace.middlewares.push('firewall');
  this.attr('security', function (security, routeSecurity) {
    return routeSecurity || [];
  });
  return this;
};
