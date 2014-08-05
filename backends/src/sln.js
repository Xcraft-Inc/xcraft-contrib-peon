'use strict';

var utils = require ('../../utils.js');

module.exports = function (srcUri, root, share, extra, callbackDone)
{
  utils.fileFromUri (srcUri, share, function (dir)
  {
    callbackDone (false);
  });
};
