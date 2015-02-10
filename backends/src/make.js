'use strict';

var path  = require ('path');
var utils = require ('../../lib/utils.js');

var make = function (cache, extra, callback) {
  if (extra.onlyPackaging || !extra.hasOwnProperty ('location')) {
    callback ();
    return;
  }

  var xProcess = require ('xcraft-core-process');

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
