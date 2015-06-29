'use strict';

var moduleName = 'peon/sln';

var base = require ('../../lib/base.js');

var xLog = require ('xcraft-core-log') (moduleName);


var msbuild = function (cache, extra, callback) {
  var fs    = require ('fs');
  var path  = require ('path');

  var xProcess = require ('xcraft-core-process') ({
    parser: 'msbuild'
  });

  xLog.verb ('Cache: ' + cache + ' ' + JSON.stringify (extra));

  var makeBin = 'msbuild'; /* FIXME: or xbuild if msbuild is not found */

  var xSubst = require ('xcraft-core-subst');

  var dir = cache;
  var file = null;

  if (fs.statSync (dir).isFile ()) {
    dir  = path.dirname (cache);
    file = path.basename (cache);
  }

  xSubst.wrap (dir, function (err, dest, callback) {
    if (err) {
      callback (err);
      return;
    }

    var args = [path.join (dest, file)];

    if (extra.args) {
      args = args.concat (extra.args);
    }

    xLog.verb (makeBin + ' ' + args.join (' '));
    xProcess.spawn (makeBin, args, {}, callback);
  }, callback);
};

module.exports = function (getObj, root, share, extra, callback) {
  base.onlyBuild (getObj, root, share, extra, callback, function (data, callback) {
    msbuild (data.fullLocation, data.extra, callback);
  });
};
