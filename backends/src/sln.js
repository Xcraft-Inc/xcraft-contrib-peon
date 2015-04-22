'use strict';

var base = require ('../../lib/base.js');

var msbuild = function (cache, extra, callback) {
  var xProcess = require ('xcraft-core-process') ();

  console.log ('cache: ' + cache + ' ' + JSON.stringify (extra));

  var makeBin = 'msbuild'; /* FIXME: or xbuild if msbuild is not found */
  var args = [
    cache
  ];

  if (extra.args) {
    args = args.concat (extra.args);
  }

  console.log (makeBin + ' ' + args.join (' '));
  xProcess.spawn (makeBin, args, {}, callback);
};

module.exports = function (getObj, root, share, extra, callback) {
  base.onlyBuild (getObj, root, share, extra, callback, function (data, callback) {
    msbuild (data.fullLocation, data.extra, callback);
  });
};
