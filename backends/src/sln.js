'use strict';

var utils = require ('../../utils.js');

module.exports = function (srcUri, root, share, extra, callbackDone) {
  utils.fileFromUri (srcUri, share, function (src) { /* jshint ignore:line */
    callbackDone (false);
  });
};
