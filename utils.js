'use strict';

var path = require ('path');
var fs   = require ('fs');

var resFromHttp = function (uriObj, destPath, callbackDone)
{
  var zogHttp = require ('zogHttp');

  var lastProgress = -1;
  var outputFile = path.join (destPath, path.basename (uriObj.pathname));

  console.log ('download %s to %s', uriObj.href, outputFile);
  zogHttp.get (uriObj.href, outputFile, function ()
  {
    if (callbackDone)
      callbackDone (outputFile);
  }, function (progress, total)
  {
    var currentProgress = parseInt (progress / total * 100);
    if (currentProgress != lastProgress && !(currentProgress % 2))
    {
      lastProgress = currentProgress;
      /* Like '%3s' */
      var strProgress = Array (4 - lastProgress.toString ().length).join (' ') + lastProgress;
      var screenProgress = parseInt (lastProgress * 40 / 100);
      console.log ('%s%% %s%s %s MB',
                   strProgress,
                   Array (screenProgress + 1).join ('.'),
                   Array (40 - screenProgress + 1).join (' '),
                   parseInt (progress / 1000) / 1000);
    }
  });
};

var fileFromZip = function (zip, destPath, callbackDone)
{
  console.log ('unzip %s to %s', zip, destPath);

  var unzip = require ('unzip');

  fs.createReadStream (zip).pipe (unzip.Extract ({ path: destPath }).on ('error', function (err)
  {
    console.error (err);
  }).on ('close', function ()
  {
    callbackDone (destPath);
  }));
};

var fileFromRes = function (res, destPath, callbackDone)
{
  var ext = path.extname (res).replace (/\./g, '');

  switch (ext)
  {
  case 'zip':
    fileFromZip (res, destPath, callbackDone);
    break;

  default:
    callbackDone (res);
    break;
  }
};

exports.fileFromUri = function (uri, root, callbackDone)
{
  var url         = require ('url');
  var zogPlatform = require ('zogPlatform');

  var uriObj = url.parse (uri);
  var tmpPath = path.join (root, 'tmp');

  switch (uriObj.protocol)
  {
  case 'http:':
  case 'https:':
    var destPath = path.join (root, 'cache');
    resFromHttp (uriObj, destPath, function (res)
    {
      fileFromRes (res, tmpPath, function (file)
      {
        callbackDone (file);
      });
    });
    break;

  case 'file:':
    var srcPath = uriObj.pathname;
    if (zogPlatform.getOs () === 'win')
      srcPath = path.normalize (srcPath.replace (/^\/([a-zA-Z]:)/, '$1'));

    fileFromRes (srcPath, tmpPath, function (file)
    {
      callbackDone (file);
    });
    break;

  default:
    console.warn (uriObj.protocol + ' not supported');
    callbackDone (uri);
    break;
  }
};
