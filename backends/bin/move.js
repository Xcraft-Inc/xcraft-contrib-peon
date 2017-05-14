'use strict';

var path = require ('path');
var base = require ('../../lib/base.js');

var move = function (location, root, response, callback) {
  var fs = require ('fs');
  var xFs = require ('xcraft-core-fs');

  response.log.verb ('move ' + location + ' to ' + root);
  var stats = fs.lstatSync (location);

  xFs.mv (
    location,
    stats.isFile () ? path.join (root, path.basename (location)) : root
  );
  callback ();
};

module.exports = function (getObj, root, share, extra, response, callback) {
  base.always (getObj, root, share, extra, response, callback, function (
    data,
    callback
  ) {
    move (data.fullLocation, root, response, callback);
  });
};
