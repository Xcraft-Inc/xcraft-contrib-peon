'use strict';

var shell = {};

shell.mv = function (src, dst) { /* jshint ignore:line */
  var path = require ('path');
  var xFs  = require ('xcraft-core-fs');

  src = path.resolve (src);
  dst = path.resolve (dst);

  xFs.mv (src, dst);
};

exports.run = function (script) {
  if (/^!/.test (script)) {
    console.warn ('only inlined scripts are currently supported');
    return;
  }

  var vm  = require ('vm');

  var sandbox = shell;
  vm.createContext (sandbox);

  console.log ('execute script: ' + script);
  vm.runInNewContext (script, sandbox);
};
