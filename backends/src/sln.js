'use strict';

var base = require ('../../lib/base.js');

var msbuild = function (cache, extra, callback) {
  var fs    = require ('fs');
  var path  = require ('path');
  var async = require ('async');

  var xProcess = require ('xcraft-core-process') ({
    parser: 'msbuild'
  });
  var Subst    = require ('xcraft-core-subst');

  console.log ('cache: ' + cache + ' ' + JSON.stringify (extra));

  var makeBin = 'msbuild'; /* FIXME: or xbuild if msbuild is not found */
  var subst = null;

  async.auto ({
    mount: function (callback) {
      var dir = cache;
      var file = null;

      if (fs.statSync (dir).isFile ()) {
        dir  = path.dirname (cache);
        file = path.basename (cache);
      }

      console.log ('mount ' + dir);
      subst = new Subst (dir);
      subst.mount (function (err, drive) {
        if (err) {
          callback (err);
          return;
        }

        callback (null, path.join (drive, file));
      });
    },

    make: ['mount', function (callback, results) {
      var args = [results.mount];

      if (extra.args) {
        args = args.concat (extra.args);
      }

      console.log (makeBin + ' ' + args.join (' '));
      xProcess.spawn (makeBin, args, {}, callback);
    }],

    umount: ['make', function (callback, results) {
      if (!subst) {
        callback ();
        return;
      }

      console.log ('umount ' + results.mount);
      subst.umount (callback);
    }]
  }, function (err) {
    callback (err);
  });
};

module.exports = function (getObj, root, share, extra, callback) {
  base.onlyBuild (getObj, root, share, extra, callback, function (data, callback) {
    msbuild (data.fullLocation, data.extra, callback);
  });
};
