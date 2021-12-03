'use strict';

const which = require('which');

module.exports = (isCore) => (cache, extra, resp, callback) => {
  var fs = require('fs');
  var path = require('path');

  var xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    forwarder: 'msbuild',
    parser: 'msbuild',
    resp,
  });

  resp.log.verb('cache: ' + cache);
  resp.log.verb(
    JSON.stringify(extra, (key, value) => (key === 'env' ? '...' : value))
  );

  let args = [];
  let makeBin = 'msbuild';
  if (!isCore) {
    try {
      which.sync(makeBin);
    } catch (ex) {
      makeBin = 'xbuild';
    }
  } else {
    makeBin = 'dotnet';
    args.push('msbuild');
  }

  var file = null;

  if (
    extra.args.all.length &&
    fs.statSync(path.join(cache, extra.args.all[0])).isFile()
  ) {
    file = extra.args.all.shift();
  }

  args = args.concat([path.join(cache, file)]);

  if (extra.args.all) {
    args = args.concat(extra.args.all);
  }

  resp.log.verb(makeBin + ' ' + args.join(' '));
  xProcess.spawn(makeBin, args, {env: extra.env || process.env}, callback);
};
