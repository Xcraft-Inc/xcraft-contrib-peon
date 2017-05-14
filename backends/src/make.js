'use strict';

var base = require ('../../lib/base.js');

var make = function (cache, extra, response, callback) {
  var async = require ('async');
  const xProcess = require ('xcraft-core-process') ({
    logger: 'xlog',
    resp: response,
  });

  response.log.verb ('cache: ' + cache + ' ' + JSON.stringify (extra));

  var makeBin = 'make'; /* FIXME: or mingw32-make if MSYS is not needed */
  var globalArgs = ['-C', cache];

  var fixFlags = function (args) {
    var flags = {
      CFLAGS: null,
      LDFLAGS: null,
    };

    var newArgs = globalArgs.slice ();

    if (args) {
      args.forEach (function (arg) {
        var res = /^(CFLAGS|LDFLAGS)=(.*)/.exec (arg);
        if (!res) {
          newArgs.push (arg);
          return;
        }

        flags[res[1]] = res[2].length ? res[2] : null;
      });
    }

    if (flags.CFLAGS) {
      newArgs.push ('CFLAGS=' + flags.CFLAGS);
    }
    if (flags.LDFLAGS) {
      newArgs.push ('LDFLAGS=' + flags.LDFLAGS);
    }

    return newArgs;
  };

  async.series (
    [
      function (callback) {
        var makeArgs = fixFlags (extra.args.all);

        response.log.verb (makeBin + ' ' + makeArgs.join (' '));
        xProcess.spawn (makeBin, makeArgs, {}, callback);
      },

      function (callback) {
        var makeArgs = fixFlags (extra.args.install);

        /* Prevent bug with jobserver and deployment. */
        makeArgs.push ('-j1');

        response.log.verb (makeBin + ' ' + makeArgs.join (' '));
        xProcess.spawn (makeBin, makeArgs, {}, callback);
      },
    ],
    callback
  );
};

module.exports = function (getObj, root, share, extra, response, callback) {
  extra._rulesTypeDir = __dirname;
  base.onlyBuild (getObj, root, share, extra, response, callback, function (
    data,
    callback
  ) {
    make (data.fullLocation, data.extra, response, callback);
  });
};
