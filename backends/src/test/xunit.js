'use strict';

const xunit = function (cache, extra, resp, callback) {
  const fs = require('fs');
  const path = require('path');

  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    //    forwarder: 'msbuild',
    //    parser:    'msbuild',
    resp,
  });

  resp.log.verb('cache: ' + cache);
  resp.log.verb(
    JSON.stringify(extra, (key, value) => (key === 'env' ? '...' : value))
  );

  const testBin = 'xunit.console';

  const xSubst = require('xcraft-core-subst');

  const dir = cache;
  let file = null;

  if (
    extra.args.test.length &&
    fs.statSync(path.join(dir, extra.args.test[0])).isFile()
  ) {
    file = extra.args.test.shift();
  }

  xSubst.wrap(
    dir,
    resp,
    (err, dest, callback) => {
      if (err) {
        callback(err);
        return;
      }

      let args = [path.join(dest, file)];

      if (extra.args.test) {
        args = args.concat(extra.args.test);
        args.push('-parallel', 'none', '-verbose');
      }

      resp.log.verb(testBin + ' ' + args.join(' '));
      xProcess.spawn(testBin, args, {}, callback);
    },
    callback
  );
};

module.exports = function (data, extra, resp, callback) {
  xunit(data.fullLocation, extra, resp, callback);
};
