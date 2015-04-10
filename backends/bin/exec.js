'use strict';

var base = require ('../../lib/base.js');

var spawn = function (bin, extra, callback) {
  var xProcess = require ('xcraft-core-process');

  console.log ('spawn %s %s', bin, extra.args.join (' '));
  xProcess.spawn (bin, extra.args, {}, callback);
};

module.exports = function (getObj, root, share, extra, callback) {
  base.onlyInstall (getObj, root, share, extra, callback, function (data, callback) {
    spawn (data.fullLocation, data.extra, callback);
  });
};
