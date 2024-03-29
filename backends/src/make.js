'use strict';

const path = require('path');
const watt = require('gigawatts');
const base = require('../../lib/base.js');
const {wrapTmp} = require('xcraft-core-subst');

var make = function (cache, extra, resp, callback) {
  var async = require('async');
  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    resp,
  });

  resp.log.verb('cache: ' + cache);
  resp.log.verb(
    JSON.stringify(extra, (key, value) => (key === 'env' ? '...' : value))
  );

  var makeBin = 'make'; /* FIXME: or mingw32-make if MSYS is not needed */

  var fixFlags = function (globalArgs, args) {
    var flags = {
      CFLAGS: null,
      LDFLAGS: null,
    };

    var newArgs = globalArgs.slice();

    if (args) {
      args.forEach(function (arg) {
        var res = /^(CFLAGS|LDFLAGS)=(.*)/.exec(arg);
        if (!res) {
          newArgs.push(arg);
          return;
        }

        flags[res[1]] = res[2].length ? res[2] : null;
      });
    }

    if (flags.CFLAGS) {
      newArgs.push('CFLAGS=' + flags.CFLAGS);
    }
    if (flags.LDFLAGS) {
      newArgs.push('LDFLAGS=' + flags.LDFLAGS);
    }

    return newArgs;
  };

  const cwd = process.cwd();

  const globalArgs = ['-C', cache];
  process.chdir(cache);

  async.series(
    [
      function (callback) {
        var makeArgs = fixFlags(globalArgs, extra.args.all);

        resp.log.verb(makeBin + ' ' + makeArgs.join(' '));
        xProcess.spawn(
          makeBin,
          makeArgs,
          {env: extra.env || process.env},
          callback
        );
      },

      function (callback) {
        var makeArgs = fixFlags(globalArgs, extra.args.install);

        /* Prevent bug with jobserver and deployment. */
        makeArgs.push('-j1');

        resp.log.verb(makeBin + ' ' + makeArgs.join(' '));
        xProcess.spawn(
          makeBin,
          makeArgs,
          {env: extra.env || process.env},
          callback
        );
      },
    ],
    (...args) => {
      process.chdir(cwd);
      callback(...args);
    }
  );
};

module.exports = watt(function* (getObj, root, share, extra, resp) {
  extra._rulesTypeDir = __dirname;
  return yield base.onlyBuild(
    (data, callback) => {
      const {dest, unwrap} = wrapTmp(share, 'build', resp);
      const location = path.join(dest, path.relative(share, data.fullLocation));
      make(location, data.extra, resp, (err) => unwrap(() => callback(err)));
    },
    getObj,
    root,
    share,
    extra,
    resp
  );
});
