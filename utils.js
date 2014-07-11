'use strict';

var path = require ('path');

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

var fileFromRes = function (res)
{
  return res;
};

exports.fileFromUri = function (uri, root, callbackDone)
{
  var url         = require ('url');
  var zogPlatform = require ('zogPlatform');

  var uriObj = url.parse (uri);

  switch (uriObj.protocol)
  {
  case 'http:':
  case 'https:':
    var destPath = path.join (root, 'cache');
    resFromHttp (uriObj, destPath, function (res)
    {
      var file = fileFromRes (res);
      callbackDone (file);
    });
    break;

  case 'file:':
    var srcPath = uriObj.pathname;
    if (zogPlatform.getOs () === 'win')
      srcPath = path.normalize (srcPath.replace (/^\/([a-zA-Z]:)/, '$1'));

    var file = fileFromRes (srcPath);
    callbackDone (file);
    break;

  default:
    console.warn (uriObj.protocol + ' not supported');
    callbackDone (uri);
    break;
  }
};
