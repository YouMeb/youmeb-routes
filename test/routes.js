'use strict';

var expect = require('chai').expect;
var Routes = require('../lib/routes');

describe('Routes', function () {
  var app = require('express')();
  var routes = new Routes(app);
});
