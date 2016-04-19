'use strict';

var base = require ('../../lib/base.js');


var spawn = function (bin, extra, response, callback) {
  const xProcess = require ('xcraft-core-process') ({
    logger: 'xlog',
    resp:   response
  });

  response.log.verb ('spawn %s %s', bin, extra.args.all.join (' '));
  xProcess.spawn (bin, extra.args.all, {}, callback);
};

module.exports = function (getObj, root, share, extra, response, callback) {
  base.onlyInstall (getObj, root, share, extra, response, callback, function (data, callback) {
    spawn (data.fullLocation, data.extra, response, callback);
  });
};
