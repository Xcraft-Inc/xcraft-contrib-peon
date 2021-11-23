'use strict';

const watt = require('gigawatts');
const path = require('path');
const xSubst = require('xcraft-core-subst');

var base = require('../../lib/base.js');

var spawn = function (bin, extra, resp, callback) {
  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    resp,
  });

  let args = extra.args.all;
  let codes = [0];
  if (/^<=-?[0-9]+(?:;-?[0-9]+)*$/.test(extra.args.all[0])) {
    args = extra.args.all.slice(1);
    codes = extra.args.all[0].substring(2).split(';');
  }

  resp.log.verb('spawn %s <= %s %s', codes.join(';'), bin, args.join(' '));
  xProcess.spawn(bin, args, {env: extra.env || process.env}, (err, code) => {
    if (codes.indexOf(code) !== -1) {
      callback(err, code);
    } else {
      callback(null, code);
    }
  });
};

module.exports = watt(function* (getObj, root, share, extra, resp) {
  return yield base.onlyInstall(
    (data, callback) => {
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
    },
    getObj,
    root,
    share,
    extra,
    resp
  );
});
