'use strict';

const which = require ('which');

var base = require ('../../lib/base.js');


var msbuild = function (cache, extra, response, callback) {
  var fs    = require ('fs');
  var path  = require ('path');

  var xProcess = require ('xcraft-core-process') ({
    logger:    'xlog',
    forwarder: 'msbuild',
    parser:    'msbuild',
    resp:      response
  });

  response.log.verb ('cache: ' + cache + ' ' + JSON.stringify (extra));

  let makeBin = 'msbuild';
  try {
    which.sync (makeBin);
  } catch (ex) {
    makeBin = 'xbuild';
  }

  var xSubst = require ('xcraft-core-subst');

  var dir = cache;
  var file = null;

  if (extra.args.all.length &&
      fs.statSync (path.join (dir, extra.args.all[0])).isFile ()) {
    file = extra.args.all.shift ();
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
