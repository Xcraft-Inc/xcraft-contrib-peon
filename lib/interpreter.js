'use strict';

var exec = {};

exec.sh = function (script, response, callback) {
  const xProcess = require ('xcraft-core-process') ({
    logger: 'xlog',
    resp: response,
  });

  var cmd = script.replace (/^!/, '');

  response.log.verb ('execute cmd: ' + cmd);
  xProcess.spawn (cmd, [], {shell: true}, callback);
};

exec.vm = function (script, response, callback) {
  var vm = require ('vm');

  var sandbox = require ('./cmds/cmds.js');
  vm.createContext (sandbox);

  response.log.verb ('execute script: ' + script);
  try {
    vm.runInNewContext (script, sandbox);
    callback ();
  } catch (ex) {
    response.log.err (ex.stack || ex);
    callback (ex);
  }
};

exports.run = function (script, response, callback) {
  exec[/^!/.test (script) ? 'sh' : 'vm'] (script, response, callback);
};
