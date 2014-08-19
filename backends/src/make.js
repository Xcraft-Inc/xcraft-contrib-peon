'use strict';

var path  = require ('path');
var utils = require ('../../utils.js');

var make = function (share, extra, callbackDone)
{
  if (!extra.hasOwnProperty ('location'))
  {
    callbackDone (true);
    return;
  }

  callbackDone (false);
};

module.exports = function (srcUri, root, share, extra, callbackDone)
{
  var fs = require ('fs');

  var cache = path.join (share, 'cache');

  if (fs.existsSync (cache))
  {
    make (share, extra, callbackDone);
    return;
  }

  utils.fileFromUri (srcUri, share, function (src)
  {
    make (share, extra, callbackDone);
  });
};
