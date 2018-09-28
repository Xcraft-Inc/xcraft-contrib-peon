'use strict';

var exec = {};

exec.sh = function(script, response, callback) {
  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    resp: response,
  });

  var cmd = script.replace(/^!/, '');

  response.log.verb('execute cmd: ' + cmd);
  xProcess.spawn(cmd, [], {shell: true}, callback);
};

exec.vm = function(script, response, callback) {
  var vm = require('vm');

  const cb = (err, res) => {
    if (err) {
      response.log.err(err.stack || err);
    }
    callback(err, res);
  };

  const watt = require('watt');
  const cmds = require('./cmds/cmds.js');

  var sandbox = cmds;
  sandbox.cmd = watt(function*(cmd, data, next) {
    return yield cmds.cmd(response, cmd, data, next);
  });
  sandbox._watt = watt;
  sandbox._callback = cb;

  response.log.verb('execute script: ' + script);
  try {
    vm.runInNewContext(
      `
      _watt(function*(next) {
        ${script}
      })(_callback);
      `,
      sandbox
    );
  } catch (ex) {
    cb(ex);
  }
};

exports.run = function(script, response, callback) {
  exec[/^!/.test(script) ? 'sh' : 'vm'](script, response, callback);
};
