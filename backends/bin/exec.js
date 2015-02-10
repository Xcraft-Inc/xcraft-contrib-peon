'use strict';

var path  = require ('path');
var utils = require ('../../lib/utils.js');

var spawn = function (cache, extra, callback) {
  if (extra.onlyPackaging) {
    callback ();
    return;
  }

  var xProcess = require ('xcraft-core-process');

  var bin = path.join (cache, extra.location);
  var args = extra.args.split (' ');

  console.log ('spawn %s %s', bin, extra.args);

  xProcess.spawn (bin, args, callback);
};

module.exports = function (srcUri, root, share, extra, callback) {
  utils.prepare (srcUri, share, extra.configure, function (err, dir) {
    if (err) {
      callback (err);
    } else {
      spawn (dir, extra, callback);
    }
  });
};
