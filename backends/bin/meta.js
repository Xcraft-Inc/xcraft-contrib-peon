'use strict';

var base = require ('../../lib/base.js');


module.exports = function (getObj, root, share, extra, response, callback) {
  base.always (getObj, root, share, extra, response, callback, function (data, callback) {
    response.log.info ('meta package');
    callback ();
  });
};
