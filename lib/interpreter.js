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

exec.vm = function(script, response, next) {
  var vm = require('vm');

  const cb = (err, res) => {
    if (err) {
      response.log.err(err.stack || err);
    }
    next(err, res);
  };

  const cmds = require('./cmds/cmds.js');

  const sandbox = cmds;
  sandbox.require = require;
  sandbox._busConfig = process.env.XCRAFT_CONFIG
    ? JSON.parse(process.env.XCRAFT_CONFIG)['xcraft-core-bus']
    : null;
  sandbox._callback = cb;

  response.log.verb('execute script: ' + script);
  try {
    vm.runInNewContext(
      `{
        const watt = require('watt');
        const xBusClient = require('xcraft-core-busclient');

        let busClient = null;
        if (_busConfig) {
          busClient = new xBusClient.BusClient(_busConfig);
        }

        const oCmd = cmd;
        cmd = watt(function*(cmd, data, next) {
          return yield oCmd(busClient, cmd, data, next);
        });

        watt(function*(next) {
          ${script}
          if (busClient.isConnected()) {
            yield busClient.stop(next);
          }
        })(_callback);
      }`,
      sandbox
    );
  } catch (ex) {
    cb(ex);
  }
};

exports.run = function(script, response, callback) {
  exec[/^!/.test(script) ? 'sh' : 'vm'](script, response, callback);
};
