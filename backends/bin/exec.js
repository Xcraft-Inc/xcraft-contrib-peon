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

  console.log ('spawn %s %s', bin, extra.args.join (' '));

  xProcess.spawn (bin, extra.args, callback);
};

module.exports = function (srcUri, root, share, extra, callback) {
  utils.prepare (srcUri, share, extra, function (err, data) {
    if (err) {
      callback (err);
    } else {
      spawn (data.location, data.extra, callback);
    }
  });
};
