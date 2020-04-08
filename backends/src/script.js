'use strict';

const watt = require('gigawatts');
const base = require('../../lib/base.js');

const script = watt(function* (cache, extra, resp, next) {
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
      yield interpreter.run(getArgs(extra.args.all), resp, next);
    }
    if (extra.args.install) {
      yield interpreter.run(getArgs(extra.args.install), resp, next);
    }
  } catch (ex) {
    throw ex;
  } finally {
    process.chdir(currentDir);
  }
});

module.exports = function (getObj, root, share, extra, resp, callback) {
  extra._rulesTypeDir = __dirname;
  base.onlyBuild(getObj, root, share, extra, resp, callback, function (
    data,
    callback
  ) {
    script(data.fullLocation, data.extra, resp, callback);
  });
};
