'use strict';

module.exports = function (srcUri, destPath)
{
  var path        = require ('path');
  var url         = require ('url');
  var zogFs       = require ('zogFs');
  var zogPlatform = require ('zogPlatform');

  var uriObj = url.parse (srcUri);

  switch (uriObj.protocol)
  {
  case 'http:':
  case 'https:':
    console.log (uriObj.protocol + ' support not implemented');
    break;

  case 'file:':
    var srcPath = uriObj.pathname;
    if (zogPlatform.getOs () === 'win')
      srcPath = path.normalize (srcPath.replace (/^\/([a-z]:)/, '$1'));

    zogFs.cpdir (srcPath, destPath);
    break;

  default:
    console.log (uriObj.protocol + ' not supported');
    break;
  }
};
