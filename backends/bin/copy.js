'use strict';

var utils = require ('../../utils.js');

module.exports = function (srcUri, root, share, extra, callbackDone) {
  var xFs = require ('xcraft-core-fs');

  if (!root) {
    console.warn ('fixme: you can\'t copy without root directory');
    callbackDone (false);
    return;
  }

  utils.fileFromUri (srcUri, share, function (file) {
    xFs.cpdir (file, root);
    if (callbackDone) {
      callbackDone (true);
    }
  });
};
