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
    var old = this.routes.namespace;

    this.routes.namespace = this.routes.getAttrs(old, attrs);

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
      route.path = route.path || '/' + (key === 'index' ? '' : key);
      route.methods = ['all'];

      route = new Route(that.$.routes.getAttrs(that.$.routes.namespace, route));

      routes.push(route);
    });

    this.routes.namespace = old;

    return routes;
  };
}
