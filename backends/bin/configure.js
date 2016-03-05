'use strict';

var moduleName = 'peon/configure';

var base = require ('../../lib/base.js');

var xLog = require ('xcraft-core-log') (moduleName);


module.exports = function (getObj, root, share, extra, callback) {
  base.onlyInstall (getObj, root, share, extra, callback, function (data, callback) {
    xLog.info ('configure package');
    callback ();
  });
};
