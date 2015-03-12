'use strict';

var path  = require ('path');
var utils = require ('./utils.js');

var proceed = function (data, extra, callback, proceedCb) {
  if (extra.hasOwnProperty ('location') && extra.location.length) {
    data.fullLocation = path.join (data.location, extra.location);
  } else {
    data.fullLocation = data.location;
  }

  try {
    proceedCb (data, callback);
  } catch (ex) {
    callback (ex.stack);
  }
};

/**
 * The proceed callback is called only when installing.
 * See pacman.install.
 *
 * This function must not be used with src backends.
 */
exports.onlyInstall = function (srcUri, root, share, extra, callback, proceedCb) {
  utils.prepare (srcUri, share, extra, function (err, data) {
    if (err) {
      callback (err);
    } else {
      if (data.extra.onlyPackaging) {
        callback ();
        return;
      }

      proceed (data, extra, callback, proceedCb);
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
exports.onlyBuild = function (srcUri, root, share, extra, callback, proceedCb) {
  if (extra.onlyPackaging) {
    delete extra.configure;
  }

  utils.prepare (srcUri, share, extra, function (err, data) {
    if (err) {
      callback (err);
    } else {
      if (extra.onlyPackaging || !extra.hasOwnProperty ('location')) {
        callback ();
        return;
      }

      proceed (data, extra, callback, proceedCb);
    }
  });
};

/**
 * The proceed callback is called when installing or packaging.
 * See pacman.install and pacman.make.
 *
 * This gunction must not be used with src backends.
 */
exports.always = function (srcUri, root, share, extra, callback, proceedCb) {
  if (extra.embedded === extra.onlyPackaging) {
    utils.prepare (srcUri, share, extra, function (err, data) {
      if (err) {
        callback (err);
      } else {
        proceed (data, extra, callback, proceedCb);
      }
    });
  } else if (callback) {
    callback ();
  }
};
