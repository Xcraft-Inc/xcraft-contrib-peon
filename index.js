'use strict';

var path  = require ('path');
var zogFs = require ('zogFs');

var backendsRoot = path.join (__dirname, 'backends');
var backends = {};
var backendsType = zogFs.lsdir (backendsRoot);

backendsType.forEach (function (type) {
  var backendsCmd = zogFs.ls (path.join (backendsRoot, type), /\.js$/);

  backends[type] = {};
  backendsCmd.forEach (function (cmd) {
    var cmdName = cmd.replace (/\.js$/, '');
    backends[type][cmdName] = require (path.join (backendsRoot, type, cmd));
  });
});

module.exports = backends;
