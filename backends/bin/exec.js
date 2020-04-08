'use strict';

const path = require('path');
const xSubst = require('xcraft-core-subst');

var base = require('../../lib/base.js');

var spawn = function (bin, extra, resp, callback) {
  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    resp,
  });

  resp.log.verb('spawn %s %s', bin, extra.args.all.join(' '));
  xProcess.spawn(bin, extra.args.all, {}, callback);
};

module.exports = function (getObj, root, share, extra, resp, callback) {
  base.onlyInstall(getObj, root, share, extra, resp, callback, function (
    data,
    callback
  ) {
    xSubst.wrap(
      data.location,
      resp,
      (err, dest, callback) => {
        if (err) {
          callback(err);
          return;
        }

        const location = path.join(dest, data.extra.location);
        spawn(location, data.extra, resp, callback);
      },
      callback
    );
  });
};
