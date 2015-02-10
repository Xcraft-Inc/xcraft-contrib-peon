'use strict';

var path  = require ('path');
var utils = require ('../../lib/utils.js');

var make = function (cache, extra, callback) {
  var xProcess = require ('xcraft-core-process');

  if (!extra.hasOwnProperty ('location')) {
    callback ();
    return;
  }

  /* TODO */
  console.log ('cache: ' + cache + ' ' + JSON.stringify (extra));
  xProcess.spawn ('make', ['-C', path.join (cache, extra.location), extra.args], callback);
};

module.exports = function (srcUri, root, share, extra, callback) {

  utils.prepare (srcUri, share, extra.configure, function (err, src) { /* jshint ignore:line */
    if (err) {
      callback (err);
    } else {
      make (src, extra, callback);
    }
  });
};
