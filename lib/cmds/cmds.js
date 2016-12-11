'use strict';

const fs   = require ('fs');
const path = require ('path');

const xFs    = require ('xcraft-core-fs');
const xUtils = require ('xcraft-core-utils');


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

exports.rpathFixup = function (prefix) {
  const xProcess = require ('xcraft-core-process') ({
    logger: 'xlog',
    resp:   exports._response
  });

  prefix = path.resolve (prefix);
  const libDir = path.join (prefix, 'lib');
  const binDir = path.join (prefix, 'bin');

  function installNameTool (args, callback) {
    xProcess.spawn ('install_name_tool', args, {}, callback);
  }

  function otool (args, callback, callbackStdout) {
    xProcess.spawn ('otool', args, {}, callback, callbackStdout);
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
  const dylibs = xFs
    .ls (libDir, /\.dylib$/)
    .map ((dylib) => {
      const dylibFull = path.join (libDir, dylib);
      const isSymlink = fs.lstatSync (dylibFull).isSymbolicLink ();
      if (!isSymlink) {
        exports._response.log.info (`set rpath id for ${dylibFull}`);
        installNameTool (['-id', `@rpath/${dylib}`, dylibFull]);
      }
      return dylibFull;
    });

  xFs
    .ls (binDir)
    .map (((bin) => path.join (binDir, bin)))
    .concat (dylibs)
    .forEach ((bin) => {
      const otoolRes = [];
      const binName = path.basename (bin);
      /* Extract otool -L dependencies */
      otool (['-L', bin], () => {
        otoolRes
          .filter ((line) => /^[\t ]+/.test (line)) /* Extract useful lines */
          .filter ((line) => /\.dylib/.test (line)) /* Ensure to be a dylib */
          .map ((line) => line.replace (/[\t ]+(.*\.dylib).*/, '\\1')) /* Extract only the path */
          .filter ((dep) => path.basename (dep) === binName) /* Skip not related dylibs */
          .forEach ((dep) => {
            exports._response.log.info (`change rpath for ${bin}`);
            installNameTool ([
              '-change', dep,
              `@rpath/${bin}`,
              path.join (libDir, bin)
            ]);
          });
      }, (line) => otoolRes.push (line));
    });
};
