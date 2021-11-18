'use strict';

const watt = require('gigawatts');
const {wrapTmp} = require('xcraft-core-subst');
const base = require('../../lib/base.js');
const msbuild = require('../../lib/backends/src/msbuild.js')(false);

module.exports = watt(function* (getObj, root, share, extra, resp, next) {
  extra._rulesTypeDir = __dirname;
  yield base.onlyBuild(
    getObj,
    root,
    share,
    extra,
    resp,
    next,
    watt(function* (err, data) {
      if (err) {
        throw err;
      }
      const {dest, unwrap} = wrapTmp(data.fullLocation, resp);
      try {
        yield msbuild(dest, data.extra, resp, next);
      } finally {
        unwrap();
      }
    })
  );
});
