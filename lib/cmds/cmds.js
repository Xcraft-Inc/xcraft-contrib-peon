'use strict';

const path = require('path');
const watt = require('gigawatts');
const fse = require('fs-extra');

const xFs = require('xcraft-core-fs');
const xUtils = require('xcraft-core-utils');
const xPlatform = require('xcraft-core-platform');
const xExtract = require('xcraft-core-extract');
const utils = require('../utils.js');
const xLog = require('xcraft-core-log');

xLog.setGlobalVerbosity(2);

const connect = watt(function* (busClient, next) {
  yield busClient.connect('axon', null, next);

  ['verb', 'info', 'warn', 'err', 'dbg'].forEach((level) => {
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

exports.cd = function (dir) {
  process.chdir(dir);
};

exports.mv = function (src, dst, regex) {
  src = path.resolve(src);
  dst = path.resolve(dst);

  xFs.mv(src, dst, regex);
};

exports.cp = function (src, dst, regex) {
  src = path.resolve(src);
  dst = path.resolve(dst);

  xFs.cp(src, dst, regex);
};

exports.rm = function (location) {
  location = path.resolve(location);

  xFs.rm(location);
};

exports.ln = function (target, location) {
  location = path.resolve(location);

  fse.symlinkSync(target, location);
};

exports.mkdir = function (location) {
  location = path.resolve(location);

  xFs.mkdir(location);
};

exports.lsall = function (location, followSymlink, filter) {
  location = path.resolve(location);

  return xFs.lsall(location, followSymlink, filter);
};

exports.chmod = function (location, mode) {
  location = path.resolve(location);

  fse.chmodSync(location, mode);
};

exports.unzip = watt(function* (src, dst, next) {
  yield xExtract.zip(src, dst, null, null, next);
});

exports.sed = xFs.sed;

exports.batch = {};

exports.batch.sed = function (location, regex, newValue) {
  location = path.resolve(location);

  xUtils.batch.run(null, location, function (file) {
    if (fse.lstatSync(file).isSymbolicLink()) {
      return;
    }
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
  yield utils.rpathFixupDir(
    prefix,
    libDir,
    binDir,
    null,
    process.env.XCRAFT_TARGETROOT,
    next
  );
});

exports.exec = (resp) =>
  watt(function* (..._args) {
    let bin = _args[0];
    const next = _args[_args.length - 1];
    const args = _args.slice(1, _args.length - 1);
    const xProcess = require('xcraft-core-process')(
      resp ? {logger: 'xlog', resp} : null
    );
    const opts = {env: exports.env};

    /* Try to start the appropriate executable on Windows */
    if (xPlatform.getOs() === 'win') {
      if (!path.isAbsolute(bin)) {
        const which = require('which');
        bin = which.sync(bin, {nothrow: true});
        if (!bin) {
          return false;
        }
      }

      if (bin.endsWith('.cmd') || bin.endsWith('.bat')) {
        opts.shell = true;
      }
    }

    return yield xProcess.spawn(bin, args, opts, next);
  });

exports.exp = function (key, value) {
  exports.env[key] = value;
};
