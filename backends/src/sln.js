'use strict';

var utils = require ('../../lib/utils.js');

module.exports = function (srcUri, root, share, extra, callback) {
  utils.prepare (srcUri, share, extra, function (err, data) { /* jshint ignore:line */
    callback ('sln is a stub: ' + err);
  });
};
