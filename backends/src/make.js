'use strict';

var base = require('../../lib/base.js');

var make = function (cache, extra, resp, callback) {
  var async = require('async');
  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    resp,
  });

  resp.log.verb('cache: ' + cache + ' ' + JSON.stringify(extra));

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

  const xSubst = require('xcraft-core-subst');

  xSubst.wrap(
    cache,
    resp,
    (err, dest, callback) => {
      if (err) {
        callback(err);
        return;
      }

      const globalArgs = ['-C', dest];

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
        callback
      );
    },
    callback
  );
};

module.exports = function (getObj, root, share, extra, resp, callback) {
  extra._rulesTypeDir = __dirname;
  base.onlyBuild(getObj, root, share, extra, resp, callback, function (
    data,
    callback
  ) {
    make(data.fullLocation, data.extra, resp, callback);
  });
};
