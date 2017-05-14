'use strict';

var path = require ('path');
var base = require ('../../lib/base.js');

var copy = function (location, root, response, callback) {
  var fs = require ('fs');
  var xFs = require ('xcraft-core-fs');

  response.log.verb ('copy ' + location + ' to ' + root);
  var stats = fs.lstatSync (location);

  xFs.cp (
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
    copy (data.fullLocation, root, response, callback);
  });
};
