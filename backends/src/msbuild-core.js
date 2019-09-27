'use strict';

const base = require('../../lib/base.js');
const msbuild = require('../../lib/backends/src/msbuild.js')(true);

module.exports = function(getObj, root, share, extra, resp, callback) {
  extra._rulesTypeDir = __dirname;
  base.onlyBuild(getObj, root, share, extra, resp, callback, function(
    data,
    callback
  ) {
    msbuild(data.fullLocation, data.extra, resp, callback);
  });
};
