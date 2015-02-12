'use strict';

var path = require ('path');
var fs   = require ('fs');
var xPh  = require ('xcraft-core-placeholder');

var xExtract = require ('xcraft-core-extract');

var resFromHttp = function (uriObj, destPath, callback) {
  var xHttp = require ('xcraft-core-http');

  var lastProgress = -1;
  var outputFile = path.join (destPath, path.basename (uriObj.pathname));

  console.log ('download %s to %s', uriObj.href, outputFile);
  xHttp.get (uriObj.href, outputFile, function () {
    if (callback) {
      callback (null, outputFile);
    }
  }, function (progress, total) {
    if (!total) {
      return;
    }

    var currentProgress = parseInt (progress / total * 100);
    if (currentProgress !== lastProgress && (currentProgress % 2) === 0) {
      lastProgress = currentProgress;
      /* Like '%3s' */
      var strProgress = new Array (4 - lastProgress.toString ().length).join (' ') + lastProgress;
      var screenProgress = parseInt (lastProgress * 40 / 100);
      console.log ('%s%% %s%s %s MB',
                   strProgress,
                   new Array (screenProgress + 1).join ('.'),
                   new Array (40 - screenProgress + 1).join (' '),
                   parseInt (progress / 1000) / 1000);
    }
  });
};

var resFromGit = function (gitUri, destPath, callback) {
  var git = require ('xcraft-core-scm').git;

  git.clone (gitUri, destPath, function (err) {
    if (err) {
      callback (err);
    } else {
      callback (null, destPath);
    }
  });
};

var fileFromZip = function (zip, type, destPath, callback) {
  console.log ('unzip %s to %s', zip, destPath);

  xExtract[type] (zip, destPath, null, function (err) {
    if (err) {
      callback (err);
    } else {
      callback (null, destPath);
    }
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
    callback (null, res);
  }
};

var fileFromUri = function (uri, share, callback) {
  var url       = require ('url');
  var xPlatform = require ('xcraft-core-platform');

  var destPath = path.join (share, 'cache');

  var uriObj = url.parse (uri);

  switch (uriObj.protocol)
  {
  case 'http:':
  case 'https:': {
    if (/\.git$/.test (uriObj.pathname)) {
      resFromGit (uri, destPath, function (err, res) {
        if (res) {
          fileFromRes (res, destPath, callback);
        }
      });
      break;
    }

    resFromHttp (uriObj, destPath, function (err, res) {
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
    callback (null, uri);
    break;
  }
  }
};

exports.prepare = function (uri, share, extra, callback) {
  var async    = require ('async');
  var traverse = require ('traverse');

  /* Inject all placeholders. */
  traverse (extra).forEach (function (value) {
    if (typeof value === 'string') {
      this.update (xPh.inject ('PEON', value));
    }
  });

  /* Build an array for the arguments. */
  if (extra.hasOwnProperty ('args')) {
    var result = [];

    extra.args = extra.args.trim ();
    if (extra.args.length) {
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
       *                 |               |              |           |        */
      extra.args /*      v               v              v           v        */
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

      console.log ('Extracted arguments: ' + extra.args.join (', '));
    }

    extra.args = result;
  }

  async.auto ({
    fetch: function (callback) {
      var cache = path.join (share, 'cache');

      if (!fs.existsSync (cache)) {
        fileFromUri (uri, share, callback);
      } else {
        callback (null, cache);
      }
    },
    configure: ['fetch', function (callback, results) {
      if (extra.configure && extra.configure.length) {
        var interpreter = require ('./interpreter.js');

        var currentDir = process.cwd ();
        process.chdir (results.fetch);
        interpreter.run (extra.configure);
        process.chdir (currentDir);
      }
      callback ();
    }]
  }, function (err, results) {
    callback (err, {
      location: results.fetch,
      extra: extra
    });
  });
};
