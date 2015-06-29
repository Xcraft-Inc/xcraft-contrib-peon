'use strict';

var moduleName = 'peon/make';

var path = require ('path');
var base = require ('../../lib/base.js');

var xLog = require ('xcraft-core-log') (moduleName);


var make = function (cache, extra, callback) {
  var async    = require ('async');
  var xProcess = require ('xcraft-core-process') ();

  xLog.verb ('Cache: ' + cache + ' ' + JSON.stringify (extra));

  var makeBin = 'make'; /* FIXME: or mingw32-make if MSYS is not needed */
  var args = [
    '-C', cache
  ];

  if (extra.args) {
    args = args.concat (extra.args);
  }

  /* FIXME: find a more generic way & pkg-config */
  var wpkgRoot = process.env.WPKG_ROOTDIR;
  var lib     = path.join (wpkgRoot, 'usr/lib/');
  var include = path.join (wpkgRoot, 'usr/include/');

  args.push ('LDFLAGS=-L' + lib);
  args.push ('CFLAGS=-I' + include);

  async.series ([
    function (callback) {
      var makeArgs = args.slice ();

      makeArgs.unshift ('all');

      xLog.verb (makeBin + ' ' + makeArgs.join (' '));
      xProcess.spawn (makeBin, makeArgs, {}, callback);
    },

    function (callback) {
      var makeArgs = args.slice ();

      makeArgs.unshift ('install');
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
