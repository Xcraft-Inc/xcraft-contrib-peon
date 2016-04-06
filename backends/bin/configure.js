'use strict';

var base = require ('../../lib/base.js');


module.exports = function (getObj, root, share, extra, response, callback) {
  base.onlyInstall (getObj, root, share, extra, response, callback, function (data, callback) {
    response.log.info ('configure package');
    callback ();
  });
};
