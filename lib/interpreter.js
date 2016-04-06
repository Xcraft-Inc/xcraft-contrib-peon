'use strict';

var exec = {};

exec.sh = function (script, response) {
  var cmd = script.replace (/^!/, '');

  response.log.verb ('execute cmd: ' + cmd);
  var execSync = require ('child_process').execSync;
  try {
    var output = execSync (cmd).toString ().replace (/\r/g, '');
    response.log.verb (output);
  } catch (ex) {
    response.log.err (ex.toString ());
    return ex.status;
  }

  return 0;
};

exec.vm = function (script, response) {
  var vm  = require ('vm');

  var sandbox = require ('./cmds/cmds.js');
  vm.createContext (sandbox);

  response.log.verb ('execute script: ' + script);
  try {
    vm.runInNewContext (script, sandbox);
  } catch (ex) {
    response.log.err (ex.toString ());
    return 1;
  }

  return 0;
};

exports.run = function (script, response) {
  return exec[/^!/.test (script) ? 'sh' : 'vm'] (script, response);
};
