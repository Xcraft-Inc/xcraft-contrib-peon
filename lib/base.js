'use strict';

var path = require('path');
var utils = require('./utils.js');

var proceed = function (data, extra, resp, callback, proceedCb) {
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
        interpreter.run(extra.deploy, resp, (err) => {
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
exports.onlyInstall = function (
  getObj,
  root,
  share,
  extra,
  resp,
  callback,
  proceedCb
) {
  if (!extra.onlyPackaging && !extra.forceConfigure) {
    delete extra.configure;
  }

  utils.prepare(getObj, root, share, extra, resp, function (err, data) {
    if (err) {
      callback(err);
    } else {
      if (data.extra.onlyPackaging) {
        callback(null, data.ref);
        return;
      }

      proceed(data, extra, resp, callback, proceedCb);
    }
  });
};

/**
 * The proceed callback is called only when compiling sources.
 * See pacman.build.
 *
 * This function must be used only with src backends because it must be called
 * by the makeAll peon method which is triggered by wpkg->CMake.
 */
exports.onlyBuild = function (
  getObj,
  root,
  share,
  extra,
  resp,
  callback,
  proceedCb
) {
  if (extra.onlyPackaging) {
    delete extra.configure;
  }

  utils.prepare(getObj, root, share, extra, resp, function (err, data) {
    if (err) {
      callback(err);
    } else {
      if (extra.onlyPackaging || !extra.hasOwnProperty('location')) {
        callback(null, data.ref);
        return;
      }

      proceed(
        data,
        extra,
        resp,
        (err) => {
          if (err) {
            callback(err);
          }

          utils.renameForWpkg(extra.prefix);
          utils.rpathFixup(extra.prefix, resp, callback);
        },
        proceedCb
      );
    }
  });
};

/**
 * The proceed callback is called when installing or packaging.
 * See pacman.install and pacman.make.
 *
 * This function must not be used with src backends.
 */
exports.always = function (
  getObj,
  root,
  share,
  extra,
  resp,
  callback,
  proceedCb
) {
  if (extra.embedded === extra.onlyPackaging) {
    utils.prepare(getObj, root, share, extra, resp, function (err, data) {
      if (err) {
        callback(err);
      } else {
        proceed(
          data,
          extra,
          resp,
          (err) => callback(err, extra.onlyPackaging ? data.ref : null),
          proceedCb
        );
      }
    });
  } else if (callback) {
    callback();
  }
};
