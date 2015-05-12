'use strict';

exports.run = function (script) {
  if (/^!/.test (script)) {
    var cmd = script.replace (/^!/, '');

    console.log ('execute cmd: ' + cmd);
    var execSync = require ('child_process').execSync;
    console.log (execSync (cmd).toString ().replace (/\r/g, ''));
    return;
  }

  var vm  = require ('vm');

  var sandbox = require ('./cmds/cmds.js');
  vm.createContext (sandbox);

  console.log ('execute script: ' + script);
  vm.runInNewContext (script.replace (/\\/g, '\\\\'), sandbox);
};
