'use strict';

var Route = require('./route');

module.exports = Controller;

function Controller(opts) {
  var that = this;
  var attrs = opts || {};

  this.$ = function (opts) {
    opts = opts || {};

    Object.keys(opts).forEach(function (key) {
      attrs[key] = opts[key];
    });
  };

  this.$.getRoutes = function () {
    var routes = [];
    var old = this.routes.scope;

    this.routes.scope = this.routes.createScope(old, attrs);

    Object.keys(that).forEach(function (key) {
      if (key === '$') {
        return;
      }

      var route = that[key];

      if (typeof route === 'function') {
        route = {
          handler: route
        };
      }

      route.name = route.name || key;
      route.path = typeof route.path === 'string' ? route.path : '/' + (key === 'index' ? '' : key);
      route.methods = ((route.methods instanceof Array) && route.methods.length !== 0) ? route.methods : ['all'];

      route = new Route(that.$.routes.createScope(that.$.routes.scope, route));

      routes.push(route);
    });

    this.routes.scope = old;

    return routes;
  };
}
