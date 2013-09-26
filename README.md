# youmeb-routes

[![Build Status](https://secure.travis-ci.org/YouMeb/youmeb-routes.png)](http://travis-ci.org/YouMeb/youmeb-routes)

A simple routing module for express.js.

## Example app

[youmeb-routes-example-app](https://github.com/YouMeb/youmeb-routes-example-app)

    git clone git://github.com/YouMeb/youmeb-routes-example-app
    cd youmeb-routes-example-app
    npm install
    node app.js

## Controller example

    module.exports = function () {
      
      this.$({
        name: 'controllerName',   // default: [filename]
        path: '/example'          // default: ''
      });

      this.index = {
        name: '',                               // default: 'index'
        path: '/',                              // default: '/'
        middlewares: ['middlewareName'],        // default: []
        handler: function (req, res, next) {
          //...
        }
      };

    };

## Generate routes

    Routes.create(app)  // or (new Routes(app))
      .source(path.join(__dirname, 'controllers-folder-1'))
      .source(path.join(__dirname, 'controllers-folder-2'))
      .generate(function (err) {
        if (err) {
          return console.error(err);
        }
        // create server
      });

## Generate a URL in controller

    req.$routes.generateUrl('routeName', {
      param1: '...',
      param2: '...'
    });

## Generate a URL in view

    path('routeName', {})

## Define a middleware

    routes.defineMiddleware('middlewareName', function () {});

## License

(The MIT License)

Copyright (c) 2013 YouMeb and contributors.
