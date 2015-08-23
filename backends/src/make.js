'use strict';

var moduleName = 'peon/make';

var path = require ('path');
var base = require ('../../lib/base.js');

var xLog = require ('xcraft-core-log') (moduleName);


var make = function (cache, extra, callback) {
  var async    = require ('async');
  var xProcess = require ('xcraft-core-process') ();

  xLog.verb ('cache: ' + cache + ' ' + JSON.stringify (extra));

  var makeBin = 'make'; /* FIXME: or mingw32-make if MSYS is not needed */
  var globalArgs = [
    '-C', cache
  ];

  /* FIXME: find a more generic way & pkg-config */
  var wpkgRoot = process.env.WPKG_ROOTDIR;
  var lib     = path.join (wpkgRoot, 'usr/lib/');
  var include = path.join (wpkgRoot, 'usr/include/');

  var fixFlags = function (args) {
    var flags = {
      CFLAGS:  '-I' + include,
      LDFLAGS: '-L' + lib
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

  async.series ([
    function (callback) {
      var makeArgs = fixFlags (extra.args.all);

      xLog.verb (makeBin + ' ' + makeArgs.join (' '));
      xProcess.spawn (makeBin, makeArgs, {}, callback);
    },

    function (callback) {
      var makeArgs = fixFlags (extra.args.install);

      /* Prevent bug with jobserver and deployment. */
      makeArgs.push ('-j1');

      xLog.verb (makeBin + ' ' + makeArgs.join (' '));
      xProcess.spawn (makeBin, makeArgs, {}, callback);
    }
  ], callback);
};

module.exports = function (getObj, root, share, extra, callback) {
  base.onlyBuild (getObj, root, share, extra, callback, function (data, callback) {
    make (data.fullLocation, data.extra, callback);
  });
};
