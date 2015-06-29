'use strict';

var moduleName = 'peon/interpreter';

var xLog = require ('xcraft-core-log') (moduleName);

var exec = {};

exec.sh = function (script) {
  var cmd = script.replace (/^!/, '');

  xLog.verb ('execute cmd: ' + cmd);
  var execSync = require ('child_process').execSync;
  try {
    var output = execSync (cmd).toString ().replace (/\r/g, '');
    xLog.verb (output);
  } catch (ex) {
    xLog.err (ex.toString ());
    return ex.status;
  }

  return 0;
};

exec.vm = function (script) {
  var vm  = require ('vm');

  var sandbox = require ('./cmds/cmds.js');
  vm.createContext (sandbox);

  xLog.verb ('execute script: ' + script);
  try {
    vm.runInNewContext (script.replace (/\\/g, '\\\\'), sandbox);
  } catch (ex) {
    xLog.err (ex.toString ());
    return 1;
  }

  return 0;
};

exports.run = function (script) {
  return exec[/^!/.test (script) ? 'sh' : 'vm'] (script);
};
