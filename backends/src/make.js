'use strict';

var path = require ('path');
var base = require ('../../lib/base.js');

var make = function (cache, extra, callback) {
  var xProcess = require ('xcraft-core-process') ();

  console.log ('cache: ' + cache + ' ' + JSON.stringify (extra));

  var args = [
    '-C', cache,
    'all', 'install'
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

  console.log (makeBin + ' ' + args.join (' '));
  xProcess.spawn ('make', args, {}, callback);
};

module.exports = function (getObj, root, share, extra, callback) {
  base.onlyBuild (getObj, root, share, extra, callback, function (data, callback) {
    make (data.fullLocation, data.extra, callback);
  });
};
