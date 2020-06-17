'use strict';

var exec = {};

exec.sh = function (script, resp, callback) {
  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    resp,
  });

  const cmd = script.replace(/^!/, '').replace(/\n/g, ' ');

  resp.log.verb('execute cmd: ' + cmd);
  xProcess.spawn(cmd, [], {shell: true}, callback);
};

exec.vm = function (script, resp, next) {
  var vm = require('vm');

  const cb = (err, res) => {
    if (err) {
      resp.log.err(err.stack || err);
    }
    next(err, res);
  };

  delete require.cache[require.resolve('./cmds/cmds.js')];
  const cmds = require('./cmds/cmds.js');

  const sandbox = cmds;
  sandbox.require = require;
  sandbox._busConfig = process.env.XCRAFT_CONFIG
    ? JSON.parse(process.env.XCRAFT_CONFIG)['xcraft-core-bus']
    : null;
  sandbox._callback = cb;
  sandbox._resp = resp;

  resp.log.verb('execute script: ' + script);
  try {
    vm.runInNewContext(
      `{
        const watt = require('gigawatts');
        const xBusClient = require('xcraft-core-busclient');

        let busClient = null;
        if (_busConfig) {
          busClient = new xBusClient.BusClient(_busConfig);
        }

        cmd = cmd(busClient);
        exec = exec(_resp);

        watt(function*(next) {
          try {
            ${script}
          } finally {
            if (busClient.isConnected()) {
              yield busClient.stop(next);
            }
          }
        })(_callback);
      }`,
      sandbox
    );
  } catch (ex) {
    cb(ex);
  }
};

exports.run = function (script, resp, callback) {
  exec[/^!/.test(script) ? 'sh' : 'vm'](script, resp, callback);
};
