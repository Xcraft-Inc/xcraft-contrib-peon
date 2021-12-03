'use strict';

const path = require('path');
const watt = require('gigawatts');
const base = require('../../lib/base.js');
const {wrapTmp} = require('xcraft-core-subst');

const script = watt(function* (cache, extra, resp, next) {
  resp.log.verb('cache: ' + cache);
  resp.log.verb(
    JSON.stringify(extra, (key, value) => (key === 'env' ? '...' : value))
  );

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

module.exports = watt(function* (getObj, root, share, extra, resp) {
  extra._rulesTypeDir = __dirname;
  return yield base.onlyBuild(
    (data, callback) => {
      const {dest, unwrap} = wrapTmp(share, 'build', resp);
      const location = path.join(dest, path.relative(share, data.fullLocation));
      script(location, data.extra, resp, (err) => unwrap(() => callback(err)));
    },
    getObj,
    root,
    share,
    extra,
    resp
  );
});
