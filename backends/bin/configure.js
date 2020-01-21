'use strict';

const watt = require('gigawatts');
const base = require('../../lib/base.js');
const helpers = require('xcraft-core-env/lib/helpers.js');

const script = watt(function*(cache, extra, resp, next) {
  resp.log.verb('cache: ' + cache + ' ' + JSON.stringify(extra));

  const interpreter = require('../../lib/interpreter.js');

  const currentDir = process.cwd();
  process.chdir(cache);

  const getArgs = args => {
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
      const script = helpers.injectPh(
        getArgs(extra.args.all),
        extra.distribution
      );
      yield interpreter.run(script, resp, next);
    }
  } catch (ex) {
    throw ex;
  } finally {
    process.chdir(currentDir);
  }
});

module.exports = function(getObj, root, share, extra, resp, callback) {
  base.onlyInstall(getObj, root, share, extra, resp, callback, function(
    data,
    callback
  ) {
    resp.log.info('configure package');
    script(data.fullLocation, data.extra, resp, callback);
  });
};
