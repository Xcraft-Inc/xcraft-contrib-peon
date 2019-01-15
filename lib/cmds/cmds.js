'use strict';

const path = require('path');
const watt = require('gigawatts');

const xFs = require('xcraft-core-fs');
const xUtils = require('xcraft-core-utils');

const connect = watt(function*(busClient, next) {
  yield busClient.connect(
    'axon',
    null,
    next
  );

  ['verb', 'info', 'warn', 'err'].forEach(level => {
    busClient.events.subscribe(
      `${busClient.getOrcName()}::widget.text.${level}`,
      msg => {
        const text = xUtils.log.decorate(
          level,
          'peon',
          msg.data.mod,
          msg.data.text,
          null,
          true
        );
        console.log(text);
      }
    );
  });
});

exports.mv = function(src, dst) {
  src = path.resolve(src);
  dst = path.resolve(dst);

  xFs.mv(src, dst);
};

exports.cp = function(src, dst) {
  src = path.resolve(src);
  dst = path.resolve(dst);

  xFs.cp(src, dst);
};

exports.rm = function(location) {
  location = path.resolve(location);

  xFs.rm(location);
};

exports.mkdir = function(location) {
  location = path.resolve(location);

  xFs.mkdir(location);
};

exports.sed = xFs.sed;

exports.batch = {};

exports.batch.sed = function(location, regex, newValue) {
  location = path.resolve(location);

  xUtils.batch.run(null, location, function(file) {
    exports.sed(file, regex, newValue);
  });
};

exports.cmd = watt(function*(busClient, cmd, data, next) {
  if (!busClient.isConnected()) {
    yield connect(busClient);
  }
  return yield busClient.command.send(cmd, data, null, next);
});
