'use strict';

var moduleName = 'peon/meta';

var base = require ('../../lib/base.js');

var xLog = require ('xcraft-core-log') (moduleName);


module.exports = function (getObj, root, share, extra, callback) {
  base.always (getObj, root, share, extra, callback, function (data, callback) {
    xLog.info ('meta package');
    callback ();
  });
};
