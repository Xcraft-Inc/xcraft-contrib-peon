'use strict';

var path  = require ('path');
var utils = require ('../../utils.js');

var spawn = function (share, extra, callbackDone) {
  if (!extra.hasOwnProperty ('location')) {
    callbackDone (true);
    return;
  }

  var zogProcess = require ('xcraft-core-process');

  var bin = path.join (share, extra.location);
  var args = extra.args.split (' ');

  console.log ('spawn %s %s', bin, extra.args);

  zogProcess.spawn (bin, args, callbackDone);
};

module.exports = function (srcUri, root, share, extra, callbackDone) {
  var fs = require ('fs');

  var cache = path.join (share, 'cache');

  if (fs.existsSync (cache)) {
    spawn (cache, extra, callbackDone);
    return;
  }

  utils.fileFromUri (srcUri, share, function (dir) {
    spawn (dir, extra, callbackDone);
  });
};
