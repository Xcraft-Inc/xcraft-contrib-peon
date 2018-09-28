'use strict';

const path = require('path');
const watt = require('watt');

const xFs = require('xcraft-core-fs');
const xUtils = require('xcraft-core-utils');

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

exports.cmd = watt(function*(resp, cmd, data, next) {
  return yield resp.command.send(cmd, data, next);
});
