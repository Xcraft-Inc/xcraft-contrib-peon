'use strict';

var base = require ('../../lib/base.js');


var msbuild = function (cache, extra, response, callback) {
  var fs    = require ('fs');
  var path  = require ('path');

  var xProcess = require ('xcraft-core-process') ({
    logger:    'xlog',
    forwarder: 'msbuild',
    parser:    'msbuild',
    response:  response
  });

  response.log.verb ('cache: ' + cache + ' ' + JSON.stringify (extra));

  var makeBin = 'msbuild'; /* FIXME: or xbuild if msbuild is not found */

  var xSubst = require ('xcraft-core-subst');

  var dir = cache;
  var file = null;

  if (fs.statSync (dir).isFile ()) {
    dir  = path.dirname (cache);
    file = path.basename (cache);
  }

  xSubst.wrap (dir, response, function (err, dest, callback) {
    if (err) {
      callback (err);
      return;
    }

    var args = [path.join (dest, file)];

    if (extra.args.all) {
      args = args.concat (extra.args.all);
    }

    response.log.verb (makeBin + ' ' + args.join (' '));
    xProcess.spawn (makeBin, args, {}, callback);
  }, callback);
};

module.exports = function (getObj, root, share, extra, response, callback) {
  base.onlyBuild (getObj, root, share, extra, response, callback, function (data, callback) {
    msbuild (data.fullLocation, data.extra, response, callback);
  });
};
