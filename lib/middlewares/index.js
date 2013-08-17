'use strict';

var fs = require('fs');
var path = require('path');

var files = fs.readdirSync(__dirname);
var isJsfileRe = /\.js$/;
var middlewares = {};

files.forEach(function (filename) {

  var stat;
  var base = path.basename(filename, '.js');

  if (base === 'index' || !isJsfileRe.test(filename)) {
    return;
  }

  filename = path.join(__dirname, filename);

  stat = fs.statSync(filename);

  if (!stat.isFile()) {
    return;
  }

  middlewares[base] = require(filename);

});

module.exports = middlewares;
