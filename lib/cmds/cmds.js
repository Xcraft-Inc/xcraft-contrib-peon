'use strict';

var fs           = require ('fs');
var path         = require ('path');
var isBinaryFile = require ('isbinaryfile');

var xFs    = require ('xcraft-core-fs');
var xUtils = require ('xcraft-core-utils');


exports.mv = function (src, dst) {
  src = path.resolve (src);
  dst = path.resolve (dst);

  xFs.mv (src, dst);
};

exports.cp = function (src, dst) {
  src = path.resolve (src);
  dst = path.resolve (dst);

  xFs.cp (src, dst);
};

exports.rm = function (location) {
  location = path.resolve (location);

  xFs.rm (location);
};

exports.sed = function (file, regex, newValue) {
  var isBin = isBinaryFile.sync (file);
  if (isBin) {
    return;
  }

  var data = fs.readFileSync (file);
  data = data.replace (regex, newValue);
  fs.writeFileSync (file, data);
};

exports.batch = {};

exports.batch.sed = function (location, regex, newValue) {
  location = path.resolve (location);

  xUtils.batch.run (null, location, function (file) {
    exports.sed (file, regex, newValue);
  });
};
