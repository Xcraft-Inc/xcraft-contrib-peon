'use strict';

const watt = require('gigawatts');

const script = watt(function* (cache, extra, resp, next) {
  resp.log.verb('cache: ' + cache);
  resp.log.verb(
    JSON.stringify(extra, (key, value) => (key === 'env' ? '...' : value))
  );

  const interpreter = require('../../../lib/interpreter.js');

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
    if (extra.args.test) {
      yield interpreter.run(getArgs(extra.args.test), extra.env, resp, next);
    }
  } finally {
    process.chdir(currentDir);
  }
});

module.exports = function (data, extra, resp, callback) {
  script(data.fullLocation, extra, resp, callback);
};
