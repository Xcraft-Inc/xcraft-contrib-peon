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
    if (!total)
      return;

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

var resFromGit = function (gitUri, destPath, callbackDone)
{
  var git = require ('zogSCM').git;

  git.clone (gitUri, destPath, function (done)
  {
    if (done)
      callbackDone (destPath);
  });
};

var fileFromZip = function (zip, destPath, callbackDone)
{
  console.log ('unzip %s to %s', zip, destPath);

  var targz = require ('tar.gz');
  var compress = new targz ().extract (zip, destPath, function (err)
  {
    if (err)
      console.error (err);
    else
      callbackDone (zip);
  });
};

var fileFromRes = function (res, destPath, callbackDone)
{
  var ext = path.extname (res).replace (/\./g, '');

  switch (ext)
  {
  case 'gz':
    fileFromZip (res, destPath, function (file)
    {
      /* The zip file is no longer necessary, we drop it. */
      fs.unlinkSync (res);
      callbackDone (file);
    });
    break;

  default:
    callbackDone (res);
    break;
  }
};

exports.fileFromUri = function (uri, share, callbackDone)
{
  var url         = require ('url');
  var zogPlatform = require ('zogPlatform');

  var uriObj = url.parse (uri);

  switch (uriObj.protocol)
  {
  case 'http:':
  case 'https:':
    var destPath = path.join (share, 'cache');

    if (/\.git$/.test (uriObj.pathname))
    {
      resFromGit (uri, destPath, function (res)
      {
        fileFromRes (res, destPath, function (file)
        {
          callbackDone (file);
        });
      });
      break;
    }

    resFromHttp (uriObj, destPath, function (res)
    {
      fileFromRes (res, destPath, function (file)
      {
        callbackDone (file);
      });
    });
    break;

  case 'file:':
    var srcPath = uriObj.pathname;
    if (zogPlatform.getOs () === 'win')
      srcPath = path.normalize (srcPath.replace (/^\/([a-zA-Z]:)/, '$1'));

    fileFromRes (srcPath, destPath, function (file)
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
