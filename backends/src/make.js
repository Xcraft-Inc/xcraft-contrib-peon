'use strict';

var path  = require ('path');
var utils = require ('../../utils.js');

var make = function (cache, extra, callback) {
  var xProcess = require ('xcraft-core-process');

  if (!extra.hasOwnProperty ('location')) {
    callback ();
    return;
  }

  /* TODO */
  console.log ('cache: ' + cache + ' ' + JSON.stringify (extra));
  xProcess.spawn ('make', ['-C', path.join (cache, extra.location)], callback);
};

module.exports = function (srcUri, root, share, extra, callback) {
  var fs = require ('fs');

  var cache = path.join (share, 'cache');

  if (fs.existsSync (cache)) {
    make (cache, extra, callback);
    return;
  }

  utils.fileFromUri (srcUri, share, function (err, src) { /* jshint ignore:line */
    if (err) {
      callback (err);
    } else {
      make (src, extra, callback);
    }
  });
};
