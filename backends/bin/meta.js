'use strict';

var base = require('../../lib/base.js');

module.exports = function (getObj, root, share, extra, resp, callback) {
  base.always(getObj, root, share, extra, resp, callback, function (
    data,
    callback
  ) {
    resp.log.info('meta package');
    callback();
  });
};
