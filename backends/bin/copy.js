'use strict';

var utils = require ('../../utils.js');

module.exports = function (srcUri, root, callbackDone)
{
  var zogFs = require ('zogFs');

  utils.fileFromUri (srcUri, root, function (file)
  {
    zogFs.cpdir (file, root);
    if (callbackDone)
      callbackDone (true);
  });
};
