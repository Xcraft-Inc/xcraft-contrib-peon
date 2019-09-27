'use strict';

var base = require('../../lib/base.js');

module.exports = function(getObj, root, share, extra, resp, callback) {
  base.onlyInstall(getObj, root, share, extra, resp, callback, function(
    data,
    callback
  ) {
    resp.log.info('configure package');
    callback();
  });
};
