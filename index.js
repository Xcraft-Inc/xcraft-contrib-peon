'use strict';

var path = require ('path');
var xFs  = require ('xcraft-core-fs');

var backendsRoot = path.join (__dirname, 'backends');
var backends = {};
var backendsType = xFs.lsdir (backendsRoot);

backendsType.forEach (function (type) {
  const typeRoot = path.join (backendsRoot, type);
  var backendsCmd = xFs.ls (typeRoot, /\.js$/);

  backends[type] = {};
  backendsCmd.forEach (function (cmd) {
    var cmdName = cmd.replace (/\.js$/, '');
    backends[type][cmdName] = require (path.join (backendsRoot, type, cmd));
  });

  const backendsSubType = xFs.lsdir (typeRoot);
  backendsSubType.forEach ((subType) => {
    const backendsSubCmd = xFs.ls (path.join (typeRoot, subType), /\.js$/);

    backends[type][subType] = {};
    backendsSubCmd.forEach ((cmd) => {
      const cmdName = cmd.replace (/\.js$/, '');
      backends[type][subType][cmdName] = require (path.join (typeRoot, subType, cmd));
    });
  });
});

module.exports = backends;
