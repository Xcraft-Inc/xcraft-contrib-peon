'use strict';

var path = require ('path');
var base = require ('../../lib/base.js');

var move = function (location, root, callback) {
  var fs  = require ('fs');
  var xFs = require ('xcraft-core-fs');

  console.log ('move ' + location + ' to ' + root);
  var stats = fs.lstatSync (location);

  xFs.mv (location, stats.isFile () ? path.join (root, path.basename (location)) : root);
  callback ();
};

module.exports = function (srcUri, root, share, extra, callback) {
  base.always (srcUri, root, share, extra, callback, function (data, callback) {
    move (data.fullLocation, root, callback);
  });
};
