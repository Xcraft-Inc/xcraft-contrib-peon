'use strict';

var utils = require ('../../utils.js');

module.exports = function (srcUri, root, share, extra, callback) {
  var xFs = require ('xcraft-core-fs');

  if (!root) {
    if (callback) {
      callback ('fixme: you can\'t copy without root directory');
    }
    return;
  }

  utils.fileFromUri (srcUri, share, function (err, file) {
    if (!err) {
      xFs.cpdir (file, root);
    }

    if (callback) {
      callback (err);
    }
  });
};
