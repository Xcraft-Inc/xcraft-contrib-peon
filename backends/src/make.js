'use strict';

var path  = require ('path');
var utils = require ('../../utils.js');

var make = function (share, extra, callback) {
  if (!extra.hasOwnProperty ('location')) {
    callback ();
    return;
  }

  /* TODO */
  callback ('make is a stub');
};

module.exports = function (srcUri, root, share, extra, callback) {
  var fs = require ('fs');

  var cache = path.join (share, 'cache');

  if (fs.existsSync (cache)) {
    make (share, extra, callback);
    return;
  }

  utils.fileFromUri (srcUri, share, function (err, src) { /* jshint ignore:line */
    if (err) {
      callback (err);
    } else {
      make (share, extra, callback);
    }
  });
};
