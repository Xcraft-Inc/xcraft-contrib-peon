'use strict';

var utils = require ('../../utils.js');

module.exports = function (srcUri, root, extra, callbackDone)
{
  var srcFile = utils.fileFromUri (srcUri, root, function (file)
  {
    if (!extra.hasOwnProperty ('bin'))
      return;

    var path       = require ('path');
    var zogProcess = require ('zogProcess');

    var bin = path.join (file, extra.bin);
    var args = extra.args.split (' ');

    console.log ('spawn %s %s', bin, extra.args);

    zogProcess.spawn (bin, args, callbackDone);
  });
};
