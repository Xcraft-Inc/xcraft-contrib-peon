'use strict';

const path = require('path');
const watt = require('gigawatts');
const base = require('../../lib/base.js');
const xSubst = require('xcraft-core-subst');

const _script = watt(function* (cache, extra, resp, next) {
  resp.log.verb('cache: ' + cache + ' ' + JSON.stringify(extra));

  const interpreter = require('../../lib/interpreter.js');

  const currentDir = process.cwd();
  process.chdir(cache);

  const getArgs = (args) => {
    if (!args) {
      return;
    }
    if (Array.isArray(args)) {
      return args.join(' ');
    }
    return args;
  };

  try {
    if (extra.args.all) {
      yield interpreter.run(getArgs(extra.args.all), extra.env, resp, next);
    }
    if (extra.args.install) {
      yield interpreter.run(getArgs(extra.args.install), extra.env, resp, next);
    }
  } finally {
    process.chdir(currentDir);
  }
});

const script = watt(function* (share, cache, extra, resp, next) {
  let _cache = path.relative(share, cache);
  _cache = _cache.split(path.sep);
  const forSubst = path.join(share, _cache[0]);

  return yield xSubst.wrap(
    forSubst,
    resp,
    (err, dest, next) => {
      dest = path.join(dest, ..._cache.slice(1));
      _script(dest, extra, resp, next);
    },
    next
  );
});

module.exports = function (getObj, root, share, extra, resp, callback) {
  extra._rulesTypeDir = __dirname;
  base.onlyBuild(getObj, root, share, extra, resp, callback, function (
    data,
    callback
  ) {
    script(share, data.fullLocation, data.extra, resp, callback);
  });
};
