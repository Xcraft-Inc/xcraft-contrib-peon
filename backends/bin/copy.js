'use strict';

var moduleName = 'peon/copy';

var path = require ('path');
var base = require ('../../lib/base.js');

var xLog = require ('xcraft-core-log') (moduleName);


var copy = function (location, root, callback) {
  var fs  = require ('fs');
  var xFs = require ('xcraft-core-fs');

  xLog.verb ('Copy ' + location + ' to ' + root);
  var stats = fs.lstatSync (location);

  xFs.cp (location, stats.isFile () ? path.join (root, path.basename (location)) : root);
  callback ();
};

module.exports = function (getObj, root, share, extra, callback) {
  base.always (getObj, root, share, extra, callback, function (data, callback) {
    copy (data.fullLocation, root, callback);
  });
};
