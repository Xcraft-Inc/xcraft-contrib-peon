'use strict';

var utils = require ('../../utils.js');

module.exports = function (srcUri, root, share, extra, callback) {
  utils.fileFromUri (srcUri, share, function (err, src) { /* jshint ignore:line */
    callback ('sln is a stub: ' + err);
  });
};
