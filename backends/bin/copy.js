'use strict';

var path = require ('path');
var base = require ('../../lib/base.js');

var copy = function (location, root, callback) {
  var fs  = require ('fs');
  var xFs = require ('xcraft-core-fs');

  console.log ('copy ' + location + ' to ' + root);
  var stats = fs.lstatSync (location);

  xFs.cp (location, stats.isFile () ? path.join (root, path.basename (location)) : root);
  callback ();
};

module.exports = function (srcUri, root, share, extra, callback) {
  base.always (srcUri, root, share, extra, callback, function (data, callback) {
    copy (data.fullLocation, root, callback);
  });
};
