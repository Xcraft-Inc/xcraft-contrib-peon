'use strict';

const base = require('../../lib/base.js');
const msbuild = require('../../lib/backends/src/msbuild.js')(false);

module.exports = function(getObj, root, share, extra, response, callback) {
  extra._rulesTypeDir = __dirname;
  base.onlyBuild(getObj, root, share, extra, response, callback, function(
    data,
    callback
  ) {
    msbuild(data.fullLocation, data.extra, response, callback);
  });
};
