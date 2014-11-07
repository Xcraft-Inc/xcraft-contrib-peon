'use strict';

var path = require ('path');
var fs   = require ('fs');

var resFromHttp = function (uriObj, destPath, callbackDone) {
  var xHttp = require ('xcraft-core-http');

  var lastProgress = -1;
  var outputFile = path.join (destPath, path.basename (uriObj.pathname));

  console.log ('download %s to %s', uriObj.href, outputFile);
  xHttp.get (uriObj.href, outputFile, function () {
    if (callbackDone) {
      callbackDone (outputFile);
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

var resFromGit = function (gitUri, destPath, callbackDone) {
  var git = require ('xcraft-core-scm').git;

  git.clone (gitUri, destPath, function (done) {
    if (done) {
      callbackDone (destPath);
    }
  });
};

var fileFromZip = function (zip, destPath, callbackDone) {
  console.log ('unzip %s to %s', zip, destPath);

  var TarGZ = require ('tar.gz');
  new TarGZ ().extract (zip, destPath, function (err) {
    if (err) {
      console.error (err);
    } else {
      callbackDone (zip);
    }
  });
};

var fileFromRes = function (res, destPath, callbackDone) {
  var ext = path.extname (res).replace (/\./g, '');

  switch (ext) {
  case 'gz': {
    fileFromZip (res, destPath, function (file) {
      /* The zip file is no longer necessary, we drop it. */
      fs.unlinkSync (res);
      callbackDone (file);
    });
    break;
  }

  default: {
    callbackDone (res);
    break;
  }
  }
};

exports.fileFromUri = function (uri, share, callbackDone) {
  var url       = require ('url');
  var xPlatform = require ('xcraft-core-platform');

  var destPath = path.join (share, 'cache');

  var uriObj = url.parse (uri);

  switch (uriObj.protocol)
  {
  case 'http:':
  case 'https:': {
    if (/\.git$/.test (uriObj.pathname)) {
      resFromGit (uri, destPath, function (res) {
        fileFromRes (res, destPath, function (file) {
          callbackDone (file);
        });
      });
      break;
    }

    resFromHttp (uriObj, destPath, function (res) {
      fileFromRes (res, destPath, function (file) {
        callbackDone (file);
      });
    });
    break;
  }

  case 'file:': {
    var srcPath = uriObj.pathname;
    if (xPlatform.getOs () === 'win') {
      srcPath = path.normalize (srcPath.replace (/^\/([a-zA-Z]:)/, '$1'));
    }

    fileFromRes (srcPath, destPath, function (file) {
      callbackDone (file);
    });
    break;
  }

  default: {
    console.warn (uriObj.protocol + ' not supported');
    callbackDone (uri);
    break;
  }
  }
};
