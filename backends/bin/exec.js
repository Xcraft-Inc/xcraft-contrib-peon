'use strict';

var path  = require ('path');
var utils = require ('../../utils.js');

var spawn = function (share, extra, callbackDone)
{
  if (!extra.hasOwnProperty ('bin'))
  {
    callbackDone (true);
    return;
  }

  var zogProcess = require ('zogProcess');

  var bin = path.join (share, extra.bin);
  var args = extra.args.split (' ');

  console.log ('spawn %s %s', bin, extra.args);

  zogProcess.spawn (bin, args, callbackDone);
};

module.exports = function (srcUri, root, share, extra, callbackDone)
{
  var fs = require ('fs');

  if (fs.existsSync (path.join (share, 'cache')))
  {
    spawn (share, extra, callbackDone);
    return;
  }

  var srcFile = utils.fileFromUri (srcUri, share, function (dir)
  {
    spawn (dir, extra, callbackDone);
  });
};
