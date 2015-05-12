'use strict';

var path = require ('path');
var xFs  = require ('xcraft-core-fs');


exports.mv = function (src, dst) {
  src = path.resolve (src);
  dst = path.resolve (dst);

  xFs.mv (src, dst);
};

exports.cp = function (src, dst) {
  src = path.resolve (src);
  dst = path.resolve (dst);

  xFs.cp (src, dst);
};
