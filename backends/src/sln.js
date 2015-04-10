'use strict';

var base = require ('../../lib/base.js');

var msbuild = function (cache, extra, callback) {
  callback ('sln is a stub');
};

module.exports = function (getObj, root, share, extra, callback) {
  base.onlyBuild (getObj, root, share, extra, callback, function (data, callback) {
    msbuild (data.fullLocation, data.extra, callback);
  });
};
