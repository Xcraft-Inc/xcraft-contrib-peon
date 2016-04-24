'use strict';

var path = require ('path');
var fs   = require ('fs');
var url  = require ('url');

const xExtract = require ('xcraft-core-extract');


var resFromHttp = function (getObj, destPath, response, callback) {
  var xHttp = require ('xcraft-core-http');

  var uriObj = url.parse (getObj.uri);
  var file   = getObj.out ? getObj.out : path.basename (uriObj.pathname);

  var outputFile = path.join (destPath, file);

  response.log.info ('download %s to %s', uriObj.href, outputFile);
  xHttp.get (uriObj.href, outputFile, function (err) {
    callback (err, !err ? outputFile : null);
  }, function (progress, total) {
    response.log.progress ('Downloading', progress, total);
  });
};

const resFromFtp = function (getObj, destPath, response, callback) {
  const xFtp = require ('xcraft-core-ftp');

  const uriObj = url.parse (getObj.uri);
  const file   = getObj.out ? getObj.out : path.basename (uriObj.pathname);

  const outputFile = path.join (destPath, file);

  response.log.info ('download %s to %s', uriObj.href, outputFile);
  xFtp.get (uriObj, outputFile, function (err) {
    callback (err, !err ? outputFile : null);
  }, function (progress, total) {
    response.log.progress ('Downloading', progress, total);
  });
};

var resFromGit = function (getObj, destPath, response, callback) {
  var git = require ('xcraft-core-scm').git;

  var outDir = path.join (destPath, 'data');
  if (getObj.out) {
    outDir = path.join (outDir, getObj.out);
  }

  git.clone (getObj.uri, getObj.ref, outDir, response, function (err) {
    if (err) {
      callback (err);
    } else {
      callback (null, destPath);
    }
  });
};

var fileFromZip = function (zip, type, destPath, response, callback) {
  var outDir = path.join (destPath, 'data');

  response.log.info ('unzip %s to %s', zip, outDir);

  xExtract[type] (zip, outDir, null, response, function (err) {
    if (err) {
      callback (err);
    } else {
      callback (null, destPath);
    }
  }, function (progress, total) {
    response.log.progress ('Extracting', progress, total);
  });
};

var fileFromRes = function (res, destPath, response, callback) {
  var ext = path.extname (res).replace (/\./g, '');

  if (xExtract.hasOwnProperty (ext)) {
    fileFromZip (res, ext, destPath, response, function (err, dir) {
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

var fileFromUri = function (getObj, share, response, callback) {
  if (!getObj.uri || !getObj.uri.length) {
    response.log.verb ('it looks like a meta-package, no URI defined');
    callback ();
    return;
  }

  var xPlatform = require ('xcraft-core-platform');

  var destPath = path.join (share, 'cache');
  var uriObj   = url.parse (getObj.uri);

  switch (uriObj.protocol) {
  case 'http:':
  case 'https:': {
    if (/\.git$/.test (uriObj.pathname)) {
      resFromGit (getObj, destPath, response, function (err, res) {
        if (err) {
          callback (err);
          return;
        }

        if (res) {
          fileFromRes (res, destPath, response, callback);
        }
      });
      break;
    }

    resFromHttp (getObj, destPath, response, function (err, res) {
      if (err) {
        callback (err);
        return;
      }

      if (res) {
        fileFromRes (res, destPath, response, callback);
      }
    });
    break;
  }

  case 'ftp:': {
    resFromFtp (getObj, destPath, response, (err, res) => {
      if (err) {
        callback (err);
        return;
      }

      if (res) {
        fileFromRes (res, destPath, response, callback);
      }
    });
    break;
  }

  case 'file:': {
    var srcPath = uriObj.pathname;
    if (xPlatform.getOs () === 'win') {
      srcPath = path.normalize (srcPath.replace (/^\/([a-zA-Z]:)/, '$1'));
    }

    fileFromRes (srcPath, destPath, response, callback);
    break;
  }

  default: {
    response.log.warn (uriObj.protocol + ' not supported');
    callback (null, getObj.uri);
    break;
  }
  }
};

var parseOptions = function (args) {
  var result = [];

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
  args /*            v               v              v           v      */
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

  return result;
};

exports.renameForWpkg = function (root) {
  const xFs = require ('xcraft-core-fs');

  xFs.batch.mv (/^(ChangeLog)$/i, '$1.__peon__', root);
};

exports.prepare = function (getObj, root, share, extra, response, callback) {
  var os        = require ('os');
  var async     = require ('async');
  var traverse  = require ('traverse');
  var xConfig   = require ('xcraft-core-etc') (null, response).load ('xcraft');
  var xPh       = require ('xcraft-core-placeholder');
  var xPlatform = require ('xcraft-core-platform');

  const arch = xPlatform.getToolchainArch ();
  const rootDir = path.join (xConfig.pkgTargetRoot, arch);

  /* Set default placeholders */
  xPh.global
    .set ('XCRAFT.HOME', path.join (xConfig.xcraftRoot, '/home'))
    .set ('WPKG.STAG',   root)
    .set ('CPUS.COUNT',  os.cpus ().length)
    .set ('OS',          xPlatform.getOs ())
    .set ('ROOTDIR',     rootDir);

  /* Inject all placeholders. */
  traverse (extra).forEach (function (value) {
    if (typeof value === 'string') {
      const escape = /^deploy|configure$/.test (this.key);
      this.update (xPh.global.inject ('PEON', value, escape));
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
        result = parseOptions (extra.args[key]);
        response.log.verb ('Extracted arguments (%s): %s', key, result.join (', '));
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

      response.log.verb (`fetch ${cache}`);

      if (!fs.existsSync (cache)) {
        fileFromUri (getObj, share, response, callback);
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

      response.log.verb ('mount ' + results.fetch);

      subst = new Subst (results.fetch, response);
      subst.mount (callback);
    }],

    /* Rename some files in order to pass the wpkg validations
     * and restore the files just before the configure step.
     */
    wpkg: ['mount', function (callback, results) {
      if (!results.mount) {
        callback ();
        return;
      }

      response.log.verb ('rename for wpkg');

      try {
        if (extra.onlyPackaging) {
          exports.renameForWpkg (results.mount);
        }
      } catch (ex) {
        if (ex.code !== 'EEXIST') {
          throw ex;
        }
        /* Maybe the files are already there because
         * it's not the first build
         */
        response.log.warn (ex.stack ? ex.stack : ex);
      }

      callback ();
    }],

    configure: ['wpkg', function (callback, results) {
      if ((!extra.forceConfigure && !results.mount) ||
          !extra.configure || !extra.configure.length) {
        callback ();
        return;
      }

      response.log.verb ('configure');

      var interpreter = require ('./interpreter.js');

      var currentDir = process.cwd ();
      if (results.mount) {
        process.chdir (results.mount);
      } else {
        response.log.warn (`configure executed without mount point, cwd: ${currentDir}`);
      }

      var rc = interpreter.run (extra.configure, response);

      if (results.mount) {
        process.chdir (currentDir);
      }
      callback (null, rc);
    }],

    umount: ['configure', function (callback, results) {
      if (!subst) {
        callback ();
        return;
      }

      response.log.verb ('umount ' + results.mount);

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
