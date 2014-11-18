'use strict';

var path = require ('path');
var fs   = require ('fs');

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

var fileFromZip = function (zip, destPath, callback) {
  console.log ('unzip %s to %s', zip, destPath);

  var xExtract = require ('xcraft-core-extract');
  xExtract.targz (zip, destPath, null, function (err) {
    if (err) {
      callback (err);
    } else {
      callback (null, zip);
    }
  });
};

var fileFromRes = function (res, destPath, callback) {
  var ext = path.extname (res).replace (/\./g, '');

  switch (ext) {
  case 'gz': {
    fileFromZip (res, destPath, function (file) {
      /* The zip file is no longer necessary, we drop it. */
      fs.unlinkSync (res);
      callback (null, file);
    });
    break;
  }

  default: {
    callback (null, res);
    break;
  }
  }
};

exports.fileFromUri = function (uri, share, callback) {
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
