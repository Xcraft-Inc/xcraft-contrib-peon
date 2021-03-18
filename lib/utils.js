'use strict';

const path = require('path');
const fse = require('fs-extra');
const watt = require('gigawatts');
const which = require('which');
const querystring = require('querystring');

const xFs = require('xcraft-core-fs');
const xExtract = require('xcraft-core-extract');
const xPlatform = require('xcraft-core-platform');
const xPacman = require('xcraft-contrib-pacman');

const resFrom = {};

resFrom.http = function (getObj, destPath, outputFile, resp, callback) {
  const xHttp = require('xcraft-core-http');

  const uriObj = new URL(getObj.uri);

  resp.log.info('download %s to %s', uriObj.href, outputFile);
  xHttp.get(
    uriObj.href,
    outputFile,
    function (err) {
      callback(err, !err ? outputFile : null);
    },
    function (progress, total) {
      resp.log.progress('Downloading', progress, total);
    }
  );
};

resFrom.ftp = function (getObj, destPath, outputFile, resp, callback) {
  const xFtp = require('xcraft-core-ftp');

  const uriObj = new URL(getObj.uri);

  resp.log.info('download %s to %s', uriObj.href, outputFile);
  xFtp.get(
    uriObj,
    outputFile,
    function (err) {
      callback(err, !err ? outputFile : null);
    },
    function (progress, total) {
      resp.log.progress('Downloading', progress, total);
    }
  );
};

resFrom.cache = function (protocol, getObj, destPath, resp, callback) {
  const xConfig = require('xcraft-core-etc')(null, resp).load('xcraft');
  const cacheRoot = path.join(xConfig.tempRoot, 'downloads');

  const uriObj = new URL(getObj.uri);
  const file = getObj.out ? getObj.out : path.basename(uriObj.pathname);
  const key = querystring.stringify({uri: getObj.uri});
  const cachedFile = path.join(cacheRoot, key);
  const outputFile = path.join(destPath, file);

  if (fse.existsSync(cachedFile)) {
    resp.log.info(`retrieve "${file}" from the cache`);
    xFs.cp(cachedFile, outputFile);
    callback(null, outputFile);
    return;
  }

  resp.log.info(`entry "${getObj.uri}" not in cache, continue with download`);
  const handler = resFrom[protocol];
  handler(getObj, destPath, outputFile, resp, (err, res) => {
    if (!err) {
      resp.log.info(`store ${file} in the cache`);
      xFs.cp(res, cachedFile);
    }
    callback(err, res);
  });
};

resFrom.git = function (getObj, destPath, resp, callback) {
  var git = require('xcraft-core-scm').git;

  var outDir = path.join(destPath, 'data');
  if (getObj.out) {
    outDir = path.join(outDir, getObj.out);
  }

  const uri = cleanUri(getObj);

  const options = {
    uri,
    ref: getObj.ref,
    out: outDir,
    externals: getObj.externals,
  };

  git.clone(options, resp, function (err, ref) {
    if (err) {
      callback(err);
    } else {
      callback(null, {ref, location: destPath});
    }
  });
};

var fileFromZip = function (zip, type, destPath, resp, callback) {
  var outDir = path.join(destPath, 'data');

  resp.log.info('unzip %s to %s', zip, outDir);

  xExtract[type](
    zip,
    outDir,
    null,
    resp,
    function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null, destPath);
      }
    },
    function (progress, total) {
      resp.log.progress('Extracting', progress, total);
    }
  );
};

var fileFromRes = function (res, destPath, resp, callback) {
  var ext = path.extname(res).replace(/\./g, '');

  if (xExtract.hasOwnProperty(ext)) {
    fileFromZip(res, ext, destPath, resp, function (err, dir) {
      if (err) {
        callback(err);
        return;
      }

      /* The zip file is no longer necessary, we drop it. */
      fse.removeSync(res);
      callback(null, {location: dir});
    });
  } else {
    if (fse.statSync(res).isFile()) {
      res = path.dirname(res);
    }

    callback(null, {location: res});
  }
};

const cleanUri = function (getObj) {
  let uri = getObj.uri;
  if (uri.startsWith('ssh+')) {
    uri = uri.replace(/^ssh\+[^:]+:\/\//, '');
  }
  return uri;
};

const typeFromUri = function (getObj) {
  const uriObj = new URL(getObj.uri);
  switch (uriObj.protocol) {
    case 'git:':
    case 'ssh+git:': {
      return 'git';
    }

    case 'http:':
    case 'https:': {
      return /\.git$/.test(uriObj.pathname) ? 'git' : 'http';
    }

    case 'ftp:': {
      return 'ftp';
    }

    case 'file:': {
      return 'file';
    }

    default: {
      return null;
    }
  }
};

var fileFromUri = function (getObj, share, resp, callback) {
  var destPath = path.join(share, 'cache');

  if (!getObj.uri || !getObj.uri.length) {
    resp.log.verb('it looks like a meta-package, no URI defined');
    xFs.mkdir(destPath);
    callback(null, {location: destPath});
    return;
  }

  var xPlatform = require('xcraft-core-platform');
  var uriObj = new URL(getObj.uri);

  switch (typeFromUri(getObj)) {
    case 'git': {
      resFrom.git(getObj, destPath, resp, (err, res) => {
        if (err) {
          callback(err);
          return;
        }

        if (res) {
          const {ref} = res;
          fileFromRes(res.location, destPath, resp, (err, result) =>
            callback(null, {ref, ...result})
          );
        }
      });
      break;
    }

    case 'http': {
      resFrom.cache('http', getObj, destPath, resp, (err, res) => {
        if (err) {
          callback(err);
          return;
        }

        if (res) {
          fileFromRes(res, destPath, resp, callback);
        }
      });
      break;
    }

    case 'ftp': {
      resFrom.cache('ftp', getObj, destPath, resp, (err, res) => {
        if (err) {
          callback(err);
          return;
        }

        if (res) {
          fileFromRes(res, destPath, resp, callback);
        }
      });
      break;
    }

    case 'file': {
      var srcPath = uriObj.pathname;
      if (xPlatform.getOs() === 'win') {
        srcPath = path.normalize(srcPath.replace(/^\/([a-zA-Z]:)/, '$1'));
      }

      fileFromRes(srcPath, destPath, resp, callback);
      break;
    }

    default: {
      resp.log.warn(uriObj.protocol + ' not supported');
      callback(null, {location: getObj.uri});
      break;
    }
  }
};

var parseOptions = function (args) {
  var result = [];

  /* This regex is able to parse correctly options like:
   *   --option=dirname
   *   --option="dir name"
   *  "--option=dir name"
   *   --option="\"dirname\""
   *   --option=dir\ name
   *   --option='dir name'
   *  '--option=dir name'
   *   --option='\'dirname\''
   *
   * white spaces ----------------------------------------------.
   * escaped double/single quotes  -----------------.           |
   * single-quotes ------------------.              |           |
   * double-quotes --.               |              |           |
   *                 |               |              |           |      */
  args /*            v               v              v           v      */
    .match(/("(?:\\"|[^"])+"|'(?:\\'|[^'])+'|(?:\\ |[^ '"])+|[ ]+)/g)
    .forEach(function (arg) {
      if (arg.trim().length === 0) {
        result.push('');
      } else {
        var idx = result.length ? result.length - 1 : 0;
        if (!result[idx]) {
          result[idx] = arg;
        } else {
          result[idx] += arg;
        }
      }
    });

  return result;
};

const fileRegex = (file, oldFileName, newFileName) => {
  const isRegExp = oldFileName instanceof RegExp;
  if ((isRegExp && oldFileName.test(file)) || file === oldFileName) {
    return isRegExp ? file.replace(oldFileName, newFileName) : newFileName;
  }
  return file;
};

exports.renameForWpkg = function (root) {
  const uniq = {};

  xFs.batch.mv((location, file) => {
    let newFileName = file;

    /* Transform symlink to text */
    const fullPath = path.join(location, newFileName);
    const st = fse.lstatSync(fullPath);
    if (st && st.isSymbolicLink()) {
      const target = fse.readlinkSync(fullPath);
      let fullTarget = target;
      if (!path.isAbsolute(target)) {
        fullTarget = path.resolve(location, target);
      }

      /* Convert the symlink to a file only when the target is out of the
       * root location.
       */
      let stl = null;
      try {
        stl = fse.statSync(fullPath);
      } catch (ex) {
        if (ex.code !== 'ENOENT') {
          throw ex;
        }
      }

      if ((stl && stl.isDirectory()) || !fullTarget.startsWith(root)) {
        fse.removeSync(fullPath);
        fse.writeFileSync(fullPath, target, {mode: st.mode});
        newFileName = `${newFileName}__peon_symlink__`;
      }
    }

    /* Reserved filename */
    newFileName = fileRegex(newFileName, /^(ChangeLog)$/i, '$1__peon__');

    /* Replace unsupported character under Windows OS */
    newFileName = fileRegex(newFileName, /[:]/g, '__peon_colon__');
    newFileName = fileRegex(newFileName, /["]/g, '__peon_quote__');
    newFileName = fileRegex(newFileName, /^[ ]/, '__peon_space__');
    newFileName = fileRegex(newFileName, /[|]/g, '__peon_pipe__');

    /* Replace reserved special filename under Windows OS
     * see --accept-special-windows-filename
     */
    if (0) {
      newFileName = fileRegex(
        newFileName,
        /^(aux|con|com[1-9]|lpt[1-9]|nul|prn)($|\.[^.]*)/,
        '__peon_$1$2__'
      );
    }

    /* Duplicate filename (case-insensitive) */
    const norm = path.join(location, newFileName.toLowerCase());
    if (uniq.hasOwnProperty(norm)) {
      newFileName = `${newFileName}__peon_${uniq[norm]}__`;
      ++uniq[norm];
    } else {
      uniq[norm] = 0;
    }

    return file !== newFileName ? newFileName : null;
  }, root);
};

exports.prepare = function (getObj, basePath, share, extra, resp, callback) {
  var os = require('os');
  var async = require('async');
  var traverse = require('traverse');
  var xConfig = require('xcraft-core-etc')(null, resp).load('xcraft');
  var xPh = require('xcraft-core-placeholder');
  var xPlatform = require('xcraft-core-platform');

  const arch = xPlatform.getToolchainArch();
  const rootDir = path.join(xConfig.pkgTargetRoot, arch);
  const targetRoot = path.join(xPacman.getTargetRoot(extra.distribution), arch);

  /* Set default placeholders */
  xPh.global
    .set('XCRAFT.HOME', path.join(xConfig.xcraftRoot, '/home'))
    .set('WPKG.STAG', basePath)
    .set('CPUS.COUNT', os.cpus().length)
    .set('OS', xPlatform.getOs())
    .set('ROOTDIR', rootDir)
    .set('PROD.ROOTDIR', targetRoot)
    .set('ENV', process.env)
    .set('ROOTTEMP', xConfig.tempRoot)
    .set(
      'ROOTDRIVE',
      xPlatform.getOs() === 'win' ? rootDir.split(path.sep)[0] : '/'
    );

  /* Inject all placeholders. */
  traverse(extra).forEach(function (value) {
    if (typeof value === 'string') {
      const escape = /^deploy|configure$/.test(this.key);
      this.update(xPh.global.inject('PEON', value, escape));
    }
  });

  /* Build an array for the arguments. */
  if (extra.hasOwnProperty('args')) {
    Object.keys(extra.args).forEach(function (key) {
      var result = [];

      if (!extra.args.hasOwnProperty(key) || !extra.args[key]) {
        return;
      }

      extra.args[key] = extra.args[key].trim();
      if (extra.args[key].length) {
        result = parseOptions(extra.args[key]);
        resp.log.verb('Extracted arguments (%s): %s', key, result.join(', '));
      }

      extra.args[key] = result;
    });
  }

  if (getObj.out && !getObj.out.length) {
    getObj.out = null;
  }

  const {Subst, wrap} = require('xcraft-core-subst');
  var subst = null;

  /* Fetch and configure the resource, then continue with the backend. */
  async.auto(
    {
      fetch: function (callback) {
        resp.log.verb('mount ' + share);

        subst = new Subst(share, resp);
        subst.mount((err, _share) => {
          if (err) {
            callback(err);
            return;
          }

          const cache = path.join(_share, 'cache');
          resp.log.verb(`fetch ${cache}`);

          if (!fse.existsSync(cache)) {
            fileFromUri(getObj, _share, resp, callback);
          } else {
            callback(null, {location: cache, noPrepare: true});
          }
        });
      },

      prepare: [
        'fetch',
        (callback, results) => {
          if (
            results.fetch.noPrepare ||
            !results.fetch.location ||
            !extra.prepare ||
            !extra.prepare.length
          ) {
            callback();
            return;
          }

          const {location} = results.fetch;
          const interpreter = require('./interpreter.js');

          const currentDir = process.cwd();
          process.chdir(location);

          resp.log.info(`run prepare step`);
          interpreter.run(extra.prepare, resp, (err) => {
            process.chdir(currentDir);
            callback(err ? `Prepare step failed: ${err}` : null);
          });
        },
      ],

      /* Rename some files in order to pass the wpkg validations.
       * The files are restored with global postinst.
       */
      wpkg: [
        'prepare',
        function (callback, results) {
          if (!results.fetch.location) {
            callback();
            return;
          }

          resp.log.verb('rename for wpkg');

          try {
            if (extra.onlyPackaging) {
              exports.renameForWpkg(results.fetch.location);
            }
          } catch (ex) {
            if (ex.code !== 'EEXIST') {
              throw ex;
            }
            /* Maybe the files are already there because
             * it's not the first build
             */
            resp.log.warn(ex.stack ? ex.stack : ex);
          }

          callback();
        },
      ],

      configure: [
        'wpkg',
        function (callback, results) {
          if (
            (!extra.forceConfigure && !results.fetch.location) ||
            !extra.configure ||
            !extra.configure.length
          ) {
            callback();
            return;
          }

          resp.log.verb('configure');

          var interpreter = require('./interpreter.js');

          var currentDir = process.cwd();
          if (results.fetch.location) {
            process.chdir(results.fetch.location);
          } else {
            resp.log.warn(
              `configure executed without mount point, cwd: ${currentDir}`
            );
          }

          interpreter.run(extra.configure, resp, (err) => {
            if (results.fetch.location) {
              process.chdir(currentDir);
            }
            callback(null, err ? `Configure step failed: ${err}` : null);
          });
        },
      ],
    },
    function (err, results) {
      if (!err && results.configure) {
        err = results.configure;
      }

      if (subst) {
        if (results.fetch) {
          /* Restore original location */
          results.fetch.location = path.join(subst.location, 'cache');
        }

        resp.log.verb(`umount ${subst.drive}:`);
        subst.umount(() => {
          callback(err, {
            extra: extra,
            ...results.fetch,
          });
        });
      } else {
        callback(err, {
          extra: extra,
          ...results.fetch,
        });
      }
    }
  );
};

function log(resp) {
  return resp
    ? resp.log
    : {
        verb: console.log,
        info: console.log,
        warn: console.log,
        err: console.error,
      };
}

const rpathFixupDarwin = watt(function* (params, resp, next) {
  let {prefix} = params;

  const xConfig = require('xcraft-core-etc')(null, resp).load('xcraft');
  const xProcess = require('xcraft-core-process')(
    resp ? {logger: 'xlog', resp} : null
  );

  const arch = xPlatform.getToolchainArch();
  const rootLibDir = path.join(xConfig.pkgTargetRoot, arch, 'usr/lib');

  prefix = path.resolve(prefix);
  const libDir =
    params.libDir !== undefined
      ? params.libDir
        ? path.dirname(params.libDir)
        : null
      : path.join(prefix, 'lib');
  const binDir =
    params.binDir !== undefined
      ? params.binDir
        ? path.dirname(params.binDir)
        : null
      : path.join(prefix, 'bin');

  function* installNameTool(args, next) {
    return yield xProcess.spawn('install_name_tool', args, {}, next);
  }

  function* otool(args, callbackStdout, next) {
    return yield xProcess.spawn('otool', args, {}, next, callbackStdout);
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

  if (libDir) {
    try {
      _dylibs = xFs.ls(libDir, /\.dylib$/);
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  for (const dylib of _dylibs) {
    const dylibFull = path.join(libDir, dylib);
    const isSymlink = fse.lstatSync(dylibFull).isSymbolicLink();
    if (!isSymlink) {
      log(resp).info(`set rpath id for ${dylibFull} to @rpath/${dylib}`);
      try {
        yield* installNameTool(['-id', `@rpath/${dylib}`, dylibFull], next);
      } catch (ex) {
        continue;
      }
      bins.push(dylibFull);
    }
    dylibs.push(dylibFull);
  }

  if (binDir) {
    try {
      bins = bins.concat(
        xFs
          .ls(binDir)
          .map((bin) => path.join(binDir, bin))
          .filter((bin) => !fse.lstatSync(bin).isSymbolicLink())
      );
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  for (const bin of bins) {
    try {
      const relativePath = path.relative(
        path.dirname(bin),
        path.join(prefix, 'lib')
      );
      yield* installNameTool(
        ['-rpath', rootLibDir, `@executable_path/${relativePath}`, bin],
        next
      );
      yield* installNameTool(['-add_rpath', rootLibDir, bin], next);
    } catch (ex) {
      /* ignore errors */
    }

    let otoolRes = [];

    try {
      yield* otool(['-L', bin], (line) => otoolRes.push(line), next);
    } catch (ex) {
      continue;
    }

    otoolRes = otoolRes
      .filter((line) => /^[\t ]+/.test(line)) /* Extract useful lines */
      .filter((line) => /\.dylib/.test(line)) /* Ensure to be a dylib */
      .map((line) =>
        line.trim().replace(/(.*\.dylib).*/, '$1')
      ) /* Extract only the path */
      .filter((dep) => dylibs.includes(dep)); /* Skip not related dylibs */

    for (const dep of otoolRes) {
      log(resp).info(`change rpath of ${dep} for ${bin}`);
      yield* installNameTool(
        ['-change', dep, `@rpath/${path.basename(dep)}`, bin],
        next
      );
    }
  }
});

const rpathFixupLinux = watt(function* (params, resp, next) {
  /* patchelf is optional, skip this step until that the patchelf package
   * is installed.
   */
  try {
    which.sync('patchelf');
  } catch (ex) {
    return;
  }

  let {prefix} = params;

  const xConfig = require('xcraft-core-etc')(null, resp).load('xcraft');
  const isBinaryFile = require('isbinaryfile');
  const xProcess = require('xcraft-core-process')(
    resp ? {logger: 'xlog', resp} : null
  );

  const arch = xPlatform.getToolchainArch();
  const rootLibDir = path.join(xConfig.pkgTargetRoot, arch, 'usr/lib');
  const rootLibDir64 = path.join(xConfig.pkgTargetRoot, arch, 'usr/lib64');

  prefix = path.resolve(prefix);
  const libDir =
    params.libDir !== undefined
      ? params.libDir
        ? path.resolve(params.libDir)
        : null
      : path.join(prefix, 'lib');
  const binDir =
    params.binDir !== undefined
      ? params.binDir
        ? path.resolve(params.binDir)
        : null
      : path.join(prefix, 'bin');

  function* patchelf(args, next) {
    return yield xProcess.spawn('patchelf', args, {}, next);
  }

  let bins = [];
  let libs = [];

  if (binDir) {
    try {
      bins = xFs.ls(binDir).map((bin) => path.join(binDir, bin));
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  if (libDir) {
    try {
      libs = xFs
        .ls(libDir)
        .filter((lib) => !/\.a$/.test(lib))
        .map((lib) => path.join(libDir, lib));
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  const files = bins
    .concat(libs)
    .filter((file) => !fse.lstatSync(file).isSymbolicLink())
    .filter((file) => isBinaryFile.sync(file));

  for (const file of files) {
    log(resp).info(`try to fix rpath for ${file}`);
    try {
      const relativePath = path.relative(
        path.dirname(file),
        path.join(prefix, 'lib')
      );
      const relativePath64 = path.relative(
        path.dirname(file),
        path.join(prefix, 'lib64')
      );
      yield* patchelf(
        [
          '--set-rpath',
          `$ORIGIN/${relativePath}:$ORIGIN/${relativePath64}:${rootLibDir}:${rootLibDir64}`,
          file,
        ],
        next
      );
    } catch (ex) {
      /* ignore errors */
    }
  }
});

exports.typeFromUri = typeFromUri;
exports.cleanUri = cleanUri;

exports.rpathFixup = watt(function* (prefix, resp) {
  switch (xPlatform.getOs()) {
    case 'darwin': {
      return yield rpathFixupDarwin({prefix}, resp);
    }

    case 'linux': {
      return yield rpathFixupLinux({prefix}, resp);
    }
  }
});

exports.rpathFixupDir = watt(function* (prefix, libDir, binDir, resp) {
  const params = {prefix, libDir, binDir};
  switch (xPlatform.getOs()) {
    case 'darwin': {
      return yield rpathFixupDarwin(params, resp);
    }

    case 'linux': {
      return yield rpathFixupLinux(params, resp);
    }
  }
});
