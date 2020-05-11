'use strict';

const path = require('path');
const watt = require('gigawatts');
const fs = require('fs');

const xFs = require('xcraft-core-fs');
const xUtils = require('xcraft-core-utils');
const utils = require('../utils.js');

const connect = watt(function* (busClient, next) {
  yield busClient.connect('axon', null, next);

  ['verb', 'info', 'warn', 'err'].forEach((level) => {
    busClient.events.subscribe(
      `${busClient.getOrcName()}::widget.text.${level}`,
      (msg) => {
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

exports.mv = function (src, dst) {
  src = path.resolve(src);
  dst = path.resolve(dst);

  xFs.mv(src, dst);
};

exports.cp = function (src, dst) {
  src = path.resolve(src);
  dst = path.resolve(dst);

  xFs.cp(src, dst);
};

exports.rm = function (location) {
  location = path.resolve(location);

  xFs.rm(location);
};

exports.ln = function (target, location) {
  location = path.resolve(location);

  fs.symlinkSync(target, location);
};

exports.mkdir = function (location) {
  location = path.resolve(location);

  xFs.mkdir(location);
};

exports.chmod = function (location, mode) {
  location = path.resolve(location);

  fs.chmodSync(location, mode);
};

exports.sed = xFs.sed;

exports.batch = {};

exports.batch.sed = function (location, regex, newValue) {
  location = path.resolve(location);

  xUtils.batch.run(null, location, function (file) {
    exports.sed(file, regex, newValue);
  });
};

exports.cmd = (busClient) =>
  watt(function* (cmd, data, next) {
    if (!busClient.isConnected()) {
      yield connect(busClient);
    }
    return yield busClient.command.send(cmd, data, null, next);
  });

exports.rpath = watt(function* (prefix, libDir, binDir, next) {
  yield utils.rpathFixupDir(prefix, libDir, binDir, null, next);
});

exports.exec = watt(function* (..._args) {
  const bin = _args[0];
  const next = _args[_args.length - 1];
  const args = _args.slice(1, _args.length - 1);
  const xProcess = require('xcraft-core-process')(null);
  return yield xProcess.spawn(bin, args, {}, next);
});

exports.exp = function (key, value) {
  process.env[key] = value;
};
