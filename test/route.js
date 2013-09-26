'use strict';

var expect = require('chai').expect;
var Route = require('../lib/route');

describe('Route', function () {
  it('should use defulat values when it doesn\'t get any arguments', function () {
    var route = new Route();
    expect(route.path).to.equal('');
    expect(route.name).to.equal('');
    expect(route.methods).to.include('all');
    expect(route.middlewares).to.be.an.instanceof(Array);
  });
});
