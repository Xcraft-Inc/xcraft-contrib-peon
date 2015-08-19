'use strict';

var moduleName = 'peon/utils';

var path = require ('path');
var fs   = require ('fs');
var url  = require ('url');

var xExtract = require ('xcraft-core-extract');
var xLog     = require ('xcraft-core-log') (moduleName);


var resFromHttp = function (getObj, destPath, callback) {
  var xHttp = require ('xcraft-core-http');

  var uriObj = url.parse (getObj.uri);
  var file   = getObj.out ? getObj.out : path.basename (uriObj.pathname);

  var outputFile = path.join (destPath, file);

  console.log ('download %s to %s', uriObj.href, outputFile);
  xHttp.get (uriObj.href, outputFile, function (err) {
    callback (err, !err ? outputFile : null);
  }, function (progress, total) {
    xLog.progress ('Downloading', progress, total);
  });
};

var resFromGit = function (getObj, destPath, callback) {
  var git = require ('xcraft-core-scm').git;

  var outDir = path.join (destPath, 'data');
  if (getObj.out) {
    outDir = path.join (outDir, getObj.out);
  }

  git.clone (getObj.uri, getObj.ref, outDir, function (err) {
    if (err) {
      callback (err);
    } else {
      callback (null, destPath);
    }
  });
};

var fileFromZip = function (zip, type, destPath, callback) {
  var outDir = path.join (destPath, 'data');

  console.log ('unzip %s to %s', zip, outDir);

  xExtract[type] (zip, outDir, null, function (err) {
    if (err) {
      callback (err);
    } else {
      callback (null, destPath);
    }
  }, function (progress, total) {
    xLog.progress ('Extracting', progress, total);
  });
};

var fileFromRes = function (res, destPath, callback) {
  var ext = path.extname (res).replace (/\./g, '');

  if (xExtract.hasOwnProperty (ext)) {
    fileFromZip (res, ext, destPath, function (err, dir) {
      if (err) {
        callback (err);
        return;
      }

      /* The zip file is no longer necessary, we drop it. */
      fs.unlinkSync (res);
      callback (null, dir);
    });
  } else {
    if (fs.statSync (res).isFile ()) {
      res = path.dirname (res);
    }

    callback (null, res);
  }
};

var fileFromUri = function (getObj, share, callback) {
  var xPlatform = require ('xcraft-core-platform');

  var destPath = path.join (share, 'cache');
  var uriObj   = url.parse (getObj.uri);

  switch (uriObj.protocol)
  {
  case 'http:':
  case 'https:': {
    if (/\.git$/.test (uriObj.pathname)) {
      resFromGit (getObj, destPath, function (err, res) {
        if (err) {
          callback (err);
          return;
        }

        if (res) {
          fileFromRes (res, destPath, callback);
        }
      });
      break;
    }

    resFromHttp (getObj, destPath, function (err, res) {
      if (err) {
        callback (err);
        return;
      }

      if (res) {
        fileFromRes (res, destPath, callback);
      }
    });
    break;
  }

  case 'file:': {
    var srcPath = uriObj.pathname;
    if (xPlatform.getOs () === 'win') {
      srcPath = path.normalize (srcPath.replace (/^\/([a-zA-Z]:)/, '$1'));
    }

    fileFromRes (srcPath, destPath, callback);
    break;
  }

  default: {
    console.warn (uriObj.protocol + ' not supported');
    callback (null, getObj.uri);
    break;
  }
  }
};

exports.prepare = function (getObj, root, share, extra, callback) {
  var os        = require ('os');
  var async     = require ('async');
  var traverse  = require ('traverse');
  var xConfig   = require ('xcraft-core-etc').load ('xcraft');
  var xPh       = require ('xcraft-core-placeholder');
  var xPlatform = require ('xcraft-core-platform');

  /* Set default placeholders */
  xPh.global
    .set ('XCRAFT.HOME', path.join (xConfig.xcraftRoot, '/home'))
    .set ('WPKG.STAG',   root)
    .set ('CPUS.COUNT',  os.cpus ().length)
    .set ('OS',          xPlatform.getOs ());

  /* Inject all placeholders. */
  traverse (extra).forEach (function (value) {
    if (typeof value === 'string') {
      this.update (xPh.global.inject ('PEON', value));
    }
  });

  /* Build an array for the arguments. */
  if (extra.hasOwnProperty ('args')) {
    Object.keys (extra.args).forEach (function (key) {
      var result = [];

      if (!extra.args.hasOwnProperty (key) || !extra.args[key]) {
        return;
      }

      extra.args[key] = extra.args[key].trim ();
      if (extra.args[key].length) {
        /* This regex is able to parse correctly options like:
         *   --option=dirname
         *   --option="dir name"
         *  "--option=dir name"
         *   --option="\"dirname\""
         *   --option=dir\ name
         *   --option='dir name'
         *  '--option=dir name'
         *   --option='\'dirname\''
         *
         * white spaces ----------------------------------------------.
         * escaped double/single quotes  -----------------.           |
         * single-quotes ------------------.              |           |
         * double-quotes --.               |              |           |
         *                 |               |              |           |      */
        extra.args[key] /* v               v              v           v      */
          .match (/("(?:\\"|[^"])+"|'(?:\\'|[^'])+'|(?:\\ |[^ '"])+|[ ]+)/g)
          .forEach (function (arg) {
            if (arg.trim ().length === 0) {
              result.push ('');
            } else {
              var idx = result.length ? result.length - 1 : 0;
              if (!result[idx]) {
                result[idx] = arg;
              } else {
                result[idx] += arg;
              }
            }
          });

        console.log ('Extracted arguments (%s): %s', key, result.join (', '));
      }

      extra.args[key] = result;
    });
  }

  if (getObj.out && !getObj.out.length) {
    getObj.out = null;
  }

  var Subst = require ('xcraft-core-subst').Subst;
  var subst = null;

  /* Fetch and configure the resource, then continue with the backend. */
  async.auto ({
    fetch: function (callback) {
      var cache = path.join (share, 'cache');

      if (!fs.existsSync (cache)) {
        fileFromUri (getObj, share, callback);
      } else {
        callback (null, cache);
      }
    },

    mount: ['fetch', function (callback, results) {
      /* 0. Nothing to mount if the target doesn't exists.
       * 1. Nothing to configure.
       */
      if (/* (0) */ !fs.existsSync (results.fetch) ||
          /* (1) */ !extra.configure || !extra.configure.length) {
        callback (null, results.fetch);
        return;
      }

      console.log ('mount ' + results.fetch);
      subst = new Subst (results.fetch);
      subst.mount (callback);
    }],

    configure: ['mount', function (callback, results) {
      if (!extra.configure || !extra.configure.length) {
        callback ();
        return;
      }

      var interpreter = require ('./interpreter.js');

      var currentDir = process.cwd ();
      process.chdir (results.mount);
      var rc = interpreter.run (extra.configure);
      process.chdir (currentDir);
      callback (null, rc);
    }],

    umount: ['configure', function (callback, results) {
      if (!subst) {
        callback ();
        return;
      }

      console.log ('umount ' + results.mount);
      subst.umount (callback);
    }]
  }, function (err, results) {
    if (!err && results.configure) {
      err = 'Configure step failed: ' + results.configure;
    }

    callback (err, {
      location: results.fetch,
      extra:    extra
    });
  });
};
