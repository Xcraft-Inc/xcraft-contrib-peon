'use strict';

var moduleName = 'peon/exec';

var base = require ('../../lib/base.js');

var xLog = require ('xcraft-core-log') (moduleName);


var spawn = function (bin, extra, callback) {
  var xProcess = require ('xcraft-core-process') ();

  xLog.verb ('spawn %s %s', bin, extra.args.all.join (' '));
  xProcess.spawn (bin, extra.args.all, {}, callback);
};

module.exports = function (getObj, root, share, extra, callback) {
  base.onlyInstall (getObj, root, share, extra, callback, function (data, callback) {
    spawn (data.fullLocation, data.extra, callback);
  });
};
