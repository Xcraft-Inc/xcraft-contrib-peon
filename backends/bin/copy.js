'use strict';

const watt = require('gigawatts');
var path = require('path');
var base = require('../../lib/base.js');

var copy = function (location, root, resp, callback) {
  var fs = require('fs');
  var xFs = require('xcraft-core-fs');

  resp.log.verb('copy ' + location + ' to ' + root);
  var stats = fs.lstatSync(location);

  xFs.cp(
    location,
    stats.isFile() ? path.join(root, path.basename(location)) : root
  );
  callback();
};

module.exports = watt(function* (getObj, root, share, extra, resp) {
  return yield base.always(
    (data, callback) => copy(data.fullLocation, root, resp, callback),
    getObj,
    root,
    share,
    extra,
    resp
  );
});
