'use strict';

var shell = {};


shell.mv = function (src, dst) {
  var path = require ('path');
  var xFs  = require ('xcraft-core-fs');

  src = path.resolve (src);
  dst = path.resolve (dst);

  xFs.mv (src, dst);
};

shell.cp = function (src, dst) {
  var path = require ('path');
  var xFs  = require ('xcraft-core-fs');

  src = path.resolve (src);
  dst = path.resolve (dst);

  xFs.cp (src, dst);
};

exports.run = function (script) {
  if (/^!/.test (script)) {
    var cmd = script.replace (/^!/, '');

    console.log ('execute cmd: ' + cmd);
    var execSync = require ('child_process').execSync;
    console.log (execSync (cmd).toString ().replace (/\r/g, ''));
    return;
  }

  var vm  = require ('vm');

  var sandbox = shell;
  vm.createContext (sandbox);

  console.log ('execute script: ' + script);
  vm.runInNewContext (script.replace (/\\/g, '\\\\'), sandbox);
};
