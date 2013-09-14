// # youmeb-routes
//
//     youmeb-routes v0.0.0
//     Copyright (c) 2013 YouMeb and contributors.
//     the MIT license

'use strict';

var fs = require('fs');
var path = require('path');
var Controller = require('./controller');

module.exports = Routes;

function helperWrapper(routes, method) {
  return function () {
    return method.apply(routes, arguments);
  };
}

// app 是 express applocation
// opts 是放預設 scope 的所有屬性
function Routes(app, opts) {
  this._source = [];

  // 預設 scope
  this.scope = this.createScope({
    path: '',
    name: '',
    middlewares: []
  }, opts || {});

  // 處理要怎麼繼承 parent scope 的屬性
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

  // 儲存所有 route
  this.collection = [];

  // scope.middlewares 中可使用的 middleware
  this.middlewares = require('./middlewares');

  // express applocation
  this.app = app;

  // 設定 express locals，讓 template 裡面可以使用一些 routes 的 helper
  app.locals.path = helperWrapper(this, this.generateUrl);
}

// 建立 routes 物件
Routes.create = function (app, opts) {
  return new Routes(app, opts);
};

// 設定 injector
Routes.prototype.injector = function (injector) {
  this._injector = injector;
  return this;
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

// 把 parent scope 還有當前的設定合併產生新的 scope
Routes.prototype.createScope = function (old, opts) {
  var that = this;
  var attrs = {};

  opts = opts || {};

  // 複製就 scope 下的屬性
  Object.keys(old).forEach(function (key) {
    attrs[key] = old[key];
  });

  // 依照之前設定好的屬性繼承方式產生新值
  // 如果屬性沒有設定，就直接覆蓋
  Object.keys(opts).forEach(function (key) {
    var val = opts[key];

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

    that.collection = that.collection.concat(controller.$.getRoutes());

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

  if (typeof source == 'function') {
    done = source;
    source = that._source;
  }

  (function next() {
    var dir = source[i++];
    var index = false;
    var files = [];
    var directories = [];

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

      old = that.scope;
      opts.name = typeof opts.name === 'string' ? opts.name : path.basename(dir);
      that.scope = that.createScope(old, opts);

      j = 0;

      function nextjDone(err) {
        if (err) {
          return done(err);
        }

        that.scan(directories, function (err) {
          if (err) {
            return done(err);
          }
          that.scope = old;
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

Routes.prototype.addRoutesToReq = function (route) {
  var that = this;
  return function (req, res, next) {
    req.$route = route;
    req.$routes = that;
    next();
  };
};

// 依照 route 名稱產生網址
Routes.prototype.generateUrl = function (name, params) {
  var route, path;

  params = params || {};

  if (!this.collectionCache.hasOwnProperty(name)) {
    return;
  }

  route = this.collectionCache[name];

  // [express - lib/utils.js#L293](https://github.com/visionmedia/express/blob/master/lib/utils.js#L293)
  return route.path.replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function (_, slash, format, key, capture, optional, star) {
    slash = slash || '';
    return (optional ? '' : slash) + params[key];
  });
};

Routes.prototype.generate = function (done) {
  var that = this;
  
  that.collectionCache = {};

  this.scan(function (err) {
    if (err) {
      return done(err);
    }

    var injectorHandler = function (handler) {
      return function (req, res, next) {
        return that._injector.invoke(handler, {
          response: res,
          request: req,
          next: next
        });
      };
    };

    that.collection.forEach(function (route) {

      that.collectionCache[route.name] = route;

      var handlers = [that.addRoutesToReq(route)];

      route.middlewares.forEach(function (name) {
        handlers.push(that.middlewares[name]);
      });

      // 搭配 youmeb-injector 服用
      if (that._injector) {
        route.handler = injectorHandler(route.handler);
      }

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
  this.scope[name] = fn();
  return this;
};

// 設定 route 可用的 middleware
Routes.prototype.defineMiddleware = function (name, middleware, enableForAll) {
  var that = this;

  if (typeof middleware === 'function') {
    this.middlewares[name] = middleware;
    if (enableForAll) {
      this.scope.middlewares.push('name');
    }
    return this;
  }

  if (typeof middleware === 'object') {
    Object.keys(middleware).forEach(function (key) {
      that.defineMiddleware(
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

Routes.prototype.useFirewall = function (groups, fn) {
  this.middlewares['firewall'] = this.middlewares['firewall'].apply(this, arguments);
  this.scope.middlewares.push('firewall');
  this.attr('security', function (security, routeSecurity) {
    return routeSecurity || [];
  });
  return this;
};
