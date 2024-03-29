'use strict';

const watt = require('gigawatts');
var path = require('path');
var base = require('../../lib/base.js');

var move = function (location, root, resp, callback) {
  var fs = require('fs');
  var xFs = require('xcraft-core-fs');

  resp.log.verb('move ' + location + ' to ' + root);
  var stats = fs.lstatSync(location);

  xFs.mv(
    location,
    stats.isFile() ? path.join(root, path.basename(location)) : root
  );
  callback();
};

module.exports = watt(function* (getObj, root, share, extra, resp) {
  return yield base.always(
    (data, callback) => move(data.fullLocation, root, resp, callback),
    getObj,
    root,
    share,
    extra,
    resp
  );
});
