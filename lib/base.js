'use strict';

const watt = require('gigawatts');
var path = require('path');
var utils = require('./utils.js');

var proceed = function (proceedCb, data, extra, resp, callback) {
  var async = require('async');

  if (extra.hasOwnProperty('location') && extra.location.length) {
    data.fullLocation = path.join(data.location, extra.location);
  } else {
    data.fullLocation = data.location;
  }

  async.series(
    [
      function (callback) {
        try {
          proceedCb(data, (err) => {
            if (err) {
              callback(err);
              return;
            }

            if (extra.test && extra.test !== 'none') {
              const test = require(path.join(
                extra._rulesTypeDir,
                'test',
                extra.test
              ));
              test(data, extra, resp, callback);
              return;
            }

            callback();
          });
        } catch (ex) {
          callback(ex.stack);
        }
      },

      function (callback) {
        if (!extra.deploy || !extra.deploy.length) {
          callback();
          return;
        }

        var interpreter = require('./interpreter.js');

        var currentDir = process.cwd();
        process.chdir(data.location);

        resp.log.info(`run deploy step`);
        interpreter.run(extra.deploy, null, resp, (err) => {
          process.chdir(currentDir);
          callback(err ? `Deploy step failed: ${err}` : null);
        });
      },
    ],
    callback
  );
};

/**
 * The proceed callback is called only when installing.
 * See pacman.install.
 *
 * This function must not be used with src backends.
 */
exports.onlyInstall = watt(function* (
  proceedCb,
  getObj,
  root,
  share,
  extra,
  resp,
  next
) {
  if (!extra.onlyPackaging && !extra.forceConfigure) {
    delete extra.configure;
  }

  const data = yield utils.prepare(
    'onlyInstall',
    getObj,
    root,
    share,
    extra,
    resp
  );

  try {
    if (data.extra.onlyPackaging) {
      return {ref: data.ref, hash: data.hash};
    }

    yield proceed(proceedCb, data, extra, resp, next);
  } finally {
    yield data.unwrap(next);
  }
});

/**
 * The proceed callback is called only when compiling sources.
 * See pacman.build.
 *
 * This function must be used only with src backends because it must be called
 * by the makeAll peon method which is triggered by wpkg->CMake.
 */
exports.onlyBuild = watt(function* (
  proceedCb,
  getObj,
  root,
  share,
  extra,
  resp,
  next
) {
  if (extra.onlyPackaging) {
    delete extra.configure;
  }

  const data = yield utils.prepare(
    'onlyBuild',
    getObj,
    root,
    share,
    extra,
    resp
  );

  if (process.env.PEON_DEBUG_ENV === '1') {
    return;
  }

  if (extra.onlyPackaging || !extra.hasOwnProperty('location')) {
    return {ref: data.ref, hash: data.hash};
  }
  yield proceed(proceedCb, data, extra, resp, next);
  yield data.unwrap(next);

  for (const subPackage in extra.prefix) {
    utils.renameForWpkg(extra.prefix[subPackage]);
    yield utils.rpathFixup(extra.prefix[subPackage], resp);
  }
});

/**
 * The proceed callback is called when installing or packaging.
 * See pacman.install and pacman.make.
 *
 * This function must not be used with src backends.
 */
exports.always = watt(function* (
  proceedCb,
  getObj,
  root,
  share,
  extra,
  resp,
  next
) {
  if (extra.embedded !== extra.onlyPackaging) {
    return;
  }

  const data = yield utils.prepare('always', getObj, root, share, extra, resp);

  try {
    yield proceed(proceedCb, data, extra, resp, next);
    return extra.onlyPackaging ? {ref: data.ref, hash: data.hash} : null;
  } finally {
    yield data.unwrap(next);
  }
});
