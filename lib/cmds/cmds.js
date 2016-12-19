'use strict';

const fs   = require ('fs');
const path = require ('path');
const watt = require ('watt');

const xFs    = require ('xcraft-core-fs');
const xUtils = require ('xcraft-core-utils');
const xPlatform = require ('xcraft-core-platform');


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

exports.rm = function (location) {
  location = path.resolve (location);

  xFs.rm (location);
};

exports.sed = xFs.sed;

exports.batch = {};

exports.batch.sed = function (location, regex, newValue) {
  location = path.resolve (location);

  xUtils.batch.run (null, location, function (file) {
    exports.sed (file, regex, newValue);
  });
};

exports.rpathFixup = watt (function * (prefix, next) {
  if (xPlatform.getOs () !== 'darwin') {
    return;
  }

  const xProcess = require ('xcraft-core-process') ({
    logger: 'xlog',
    resp:   exports._response
  });

  prefix = path.resolve (prefix);
  const libDir = path.join (prefix, 'lib');
  const binDir = path.join (prefix, 'bin');

  function * installNameTool (args, next) {
    return yield xProcess.spawn ('install_name_tool', args, {}, next);
  }

  function * otool (args, callbackStdout, next) {
    return yield xProcess.spawn ('otool', args, {}, next, callbackStdout);
  }

  /*
   * DARWIN
   *
   * 1. Search all dylib files in <prefix>/lib
   *    Skip symbolic links, check suffix and check that it's binary
   * 2. Fix ID for all dylib files
   *    Use install_name_tool -id
   * 3. Change path for all known deps (dylib in 1.) of dylib files (See 5.)
   *    Look for path with otool -L (maybe it's related to a symbolic link)
   *    Use install_name_tool -change
   * 4. Search all binary files in <prefix>/bin
   *    Skip symbolic links and check that it's binary
   * 5. Change path for all known deps (dylib in 1.) of binary files (like 3.)
   *    Look for path with otool -L (maybe it's related to a symbolic link)
   *    Use install_name_tool -change
   */

  let bins = [];
  let dylibs = [];
  let _dylibs = [];

  try {
    _dylibs = xFs.ls (libDir, /\.dylib$/);
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw ex;
    }
  }

  for (const dylib of _dylibs) {
    const dylibFull = path.join (libDir, dylib);
    const isSymlink = fs.lstatSync (dylibFull).isSymbolicLink ();
    if (!isSymlink) {
      exports._response.log.info (`set rpath id for ${dylibFull} to @rpath/${dylib}`);
      yield * installNameTool (['-id', `@rpath/${dylib}`, dylibFull], next);
    }
    dylibs.push (dylibFull);
    bins.push (dylibFull);
  }

  try {
    bins = bins.concat (xFs
      .ls (binDir)
      .map (((bin) => path.join (binDir, bin))));
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw ex;
    }
  }

  for (const bin of bins) {
    let otoolRes = [];

    yield * otool (['-L', bin], (line) => otoolRes.push (line), next);
    otoolRes = otoolRes
      .filter ((line) => /^[\t ]+/.test (line)) /* Extract useful lines */
      .filter ((line) => /\.dylib/.test (line)) /* Ensure to be a dylib */
      .map ((line) => line.trim ().replace (/(.*\.dylib).*/, '$1')) /* Extract only the path */
      .filter ((dep) => dylibs.includes (dep)); /* Skip not related dylibs */

    for (const dep of otoolRes) {
      exports._response.log.info (`change rpath of ${dep} for ${bin}`);
      yield * installNameTool (['-change', dep, `@rpath/${path.basename (dep)}`, bin], next);
    }
  }
});
