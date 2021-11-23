'use strict';

const watt = require('gigawatts');
var base = require('../../lib/base.js');

module.exports = watt(function* (getObj, root, share, extra, resp) {
  return yield base.always(
    (data, callback) => {
      resp.log.info('meta package');
      callback();
    },
    getObj,
    root,
    share,
    extra,
    resp
  );
});
