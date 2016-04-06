'use strict';

var path  = require ('path');
var utils = require ('./utils.js');


var proceed = function (data, extra, response, callback, proceedCb) {
  var async = require ('async');

  if (extra.hasOwnProperty ('location') && extra.location.length) {
    data.fullLocation = path.join (data.location, extra.location);
  } else {
    data.fullLocation = data.location;
  }

  async.series ([
    function (callback) {
      try {
        proceedCb (data, callback);
      } catch (ex) {
        callback (ex.stack);
      }
    },

    function (callback) {
      if (!extra.deploy || !extra.deploy.length) {
        callback ();
        return;
      }

      var interpreter = require ('./interpreter.js');

      var currentDir = process.cwd ();
      process.chdir (data.location);
      var rc = interpreter.run (extra.deploy, response);
      process.chdir (currentDir);
      if (rc) {
        callback ('Deploy step failed: ' + rc);
      }
    }
  ], callback);
};

/**
 * The proceed callback is called only when installing.
 * See pacman.install.
 *
 * This function must not be used with src backends.
 */
exports.onlyInstall = function (getObj, root, share, extra, response, callback, proceedCb) {
  utils.prepare (getObj, root, share, extra, response, function (err, data) {
    if (err) {
      callback (err);
    } else {
      if (data.extra.onlyPackaging) {
        callback ();
        return;
      }

      proceed (data, extra, response, callback, proceedCb);
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
exports.onlyBuild = function (getObj, root, share, extra, response, callback, proceedCb) {
  if (extra.onlyPackaging) {
    delete extra.configure;
  }

  utils.prepare (getObj, root, share, extra, response, function (err, data) {
    if (err) {
      callback (err);
    } else {
      if (extra.onlyPackaging || !extra.hasOwnProperty ('location')) {
        callback ();
        return;
      }

      proceed (data, extra, response, callback, proceedCb);
    }
  });
};

/**
 * The proceed callback is called when installing or packaging.
 * See pacman.install and pacman.make.
 *
 * This function must not be used with src backends.
 */
exports.always = function (getObj, root, share, extra, response, callback, proceedCb) {
  if (extra.embedded === extra.onlyPackaging) {
    utils.prepare (getObj, root, share, extra, response, function (err, data) {
      if (err) {
        callback (err);
      } else {
        proceed (data, extra, response, callback, proceedCb);
      }
    });
  } else if (callback) {
    callback ();
  }
};
