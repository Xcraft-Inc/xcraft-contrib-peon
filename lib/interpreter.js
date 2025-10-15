'use strict';

var exec = {};

exec.sh = function (script, env, resp, callback) {
  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    resp,
  });

  let shell = true;

  const cmd = script
    .replace(/^!(?:{([^}]+)})?/, (...m) => {
      shell = m[1] || true;
      return '';
    })
    .replace(/\n/g, ' ');

  if (
    typeof shell === 'string' &&
    shell.indexOf('/') === -1 &&
    shell.indexOf('\\') === -1
  ) {
    const which = require('which');
    shell = which.sync(shell, {nothrow: true});
    if (!shell) {
      shell = true;
    }
  }

  resp.log.verb(`execute ${shell === true ? 'cmd' : shell}:\n` + script);
  xProcess.spawn(cmd, [], {shell, env: env || process.env}, callback);
};

exec.vm = function (script, env, resp, next) {
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
  sandbox.env = Object.assign({}, env || process.env);
  sandbox.cwd = process.cwd();
  sandbox._busConfig = process.env.XCRAFT_CONFIG
    ? JSON.parse(process.env.XCRAFT_CONFIG)['xcraft-core-bus']
    : null;
  sandbox._callback = cb;
  sandbox._resp = resp;
  sandbox.imp = (namespace) => cmds.scripts(sandbox, namespace);

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

exports.run = function (script, env, resp, callback) {
  exec[/^!/.test(script) ? 'sh' : 'vm'](script, env, resp, callback);
};
