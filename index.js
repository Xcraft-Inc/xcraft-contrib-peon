'use strict';

var path = require ('path');
var xFs  = require ('xcraft-core-fs');

var backendsRoot = path.join (__dirname, 'backends');
var backends = {};
var backendsType = xFs.lsdir (backendsRoot);

backendsType.forEach (function (type) {
  var backendsCmd = xFs.ls (path.join (backendsRoot, type), /\.js$/);

  backends[type] = {};
  backendsCmd.forEach (function (cmd) {
    var cmdName = cmd.replace (/\.js$/, '');
    backends[type][cmdName] = require (path.join (backendsRoot, type, cmd));
  });
});

module.exports = backends;
