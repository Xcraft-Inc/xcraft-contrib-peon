'use strict';

var moduleName = 'peon/move';

var path = require ('path');
var base = require ('../../lib/base.js');

var xLog = require ('xcraft-core-log') (moduleName);


var move = function (location, root, callback) {
  var fs  = require ('fs');
  var xFs = require ('xcraft-core-fs');

  xLog.verb ('move ' + location + ' to ' + root);
  var stats = fs.lstatSync (location);

  xFs.mv (location, stats.isFile () ? path.join (root, path.basename (location)) : root);
  callback ();
};

module.exports = function (getObj, root, share, extra, callback) {
  base.always (getObj, root, share, extra, callback, function (data, callback) {
    move (data.fullLocation, root, callback);
  });
};
