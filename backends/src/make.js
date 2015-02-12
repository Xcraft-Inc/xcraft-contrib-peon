'use strict';

var path  = require ('path');
var utils = require ('../../lib/utils.js');

var make = function (cache, root, extra, callback) {
  if (extra.onlyPackaging || !extra.hasOwnProperty ('location')) {
    callback ();
    return;
  }

  var xProcess = require ('xcraft-core-process');

  console.log ('cache: ' + cache + ' ' + JSON.stringify (extra));

  var args = [
    '-C', path.join (cache, extra.location),
    'all', 'install'
  ];

  if (extra.args) {
    args = args.concat (extra.args);
  }

  /* FIXME: find a more generic way & pkg-config */
  var wpkgRoot = process.env.WPKG_ROOTDIR;
  var lib = path.join (wpkgRoot, 'usr/lib/');
  var include = path.join (wpkgRoot, 'usr/include/');
  args.push ('LDFLAGS=-L' + lib);
  args.push ('CFLAGS=-I' + include);

  console.log ('make -C ' + path.join (cache, extra.location) + ' ' + args.join (' '));

  xProcess.spawn ('make', args, callback);
};

module.exports = function (srcUri, root, share, extra, callback) {
  if (extra.onlyPackaging) {
    delete extra.configure;
  }

  utils.prepare (srcUri, share, extra, function (err, data) { /* jshint ignore:line */
    if (err) {
      callback (err);
    } else {
      make (data.location, root, data.extra, callback);
    }
  });
};
