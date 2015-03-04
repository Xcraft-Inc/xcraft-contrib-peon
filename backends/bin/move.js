'use strict';

var path  = require ('path');
var utils = require ('../../lib/utils.js');

var move = function (location, root, extra, callback) {
  var fs  = require ('fs');
  var xFs = require ('xcraft-core-fs');

  if (extra.hasOwnProperty ('location') && extra.location.length) {
    location = path.join (location, extra.location);
  }

  try {
    console.log ('move ' + location + ' to ' + root);
    var stats = fs.lstatSync (location);

    xFs.mv (location, stats.isFile () ? path.join (root, path.basename (location)) : root);
  } catch (ex) {
    if (callback) {
      callback (ex.stack);
    }
    return;
  }

  callback ();
};

module.exports = function (srcUri, root, share, extra, callback) {
  if ( extra.embedded &&  extra.onlyPackaging ||
      !extra.embedded && !extra.onlyPackaging) {
    utils.prepare (srcUri, share, extra, function (err, data) {
      if (err) {
        if (callback) {
          callback (err);
        }
        return;
      }

      move (data.location, root, data.extra, callback);
    });
  } else if (callback) {
    callback ();
  }
};
