'use strict';

var utils = require ('../../utils.js');

module.exports = function (srcUri, root, callbackDone)
{
  var srcFile = utils.fileFromUri (srcUri, root, function (file)
  {
    /* TODO: spawn file */
    callbackDone (false);
  });
};
