'use strict';

const path = require('path');
const watt = require('gigawatts');
const {wrapTmp} = require('xcraft-core-subst');
const base = require('../../lib/base.js');
const msbuild = require('../../lib/backends/src/msbuild.js')(true);

module.exports = watt(function* (getObj, root, share, extra, resp, next) {
  extra._rulesTypeDir = __dirname;
  return yield base.onlyBuild(
    (data, callback) => {
      const {dest, unwrap} = wrapTmp(share, resp);
      const location = path.join(dest, path.relative(share, data.fullLocation));
      msbuild(location, data.extra, resp, (err) => {
        unwrap();
        callback(err);
      });
    },
    getObj,
    root,
    share,
    extra,
    resp
  );
});
