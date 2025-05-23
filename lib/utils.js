'use strict';

const path = require('path');
const fse = require('fs-extra');
const url = require('url');
const watt = require('gigawatts');
const which = require('which');
const clone = require('clone');

const xFs = require('xcraft-core-fs');
const xExtract = require('xcraft-core-extract');
const xPlatform = require('xcraft-core-platform');
const xPacman = require('xcraft-contrib-pacman');

const resFrom = {};

resFrom.http = function (getObj, destPath, outputFile, resp, callback) {
  const xHttp = require('xcraft-core-http');

  const uriObj = url.parse(getObj.uri);

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

  const uriObj = url.parse(getObj.uri);

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

resFrom.cache = watt(function* (protocol, getObj, destPath, resp, next) {
  const xConfig = require('xcraft-core-etc')(null, resp).load('xcraft');
  const {fileChecksum} = require('xcraft-core-utils/lib/file-crypto.js');
  const cacheRoot = path.join(xConfig.tempRoot, 'downloads');

  const uriObj = url.parse(getObj.uri);
  const file = getObj.out ? getObj.out : path.basename(uriObj.pathname);
  const outputFile = path.join(destPath, file);
  const basename = path.basename(file);

  if (getObj.$hash) {
    const cachedFile = path.join(cacheRoot, getObj.$hash);
    if (fse.existsSync(cachedFile)) {
      resp.log.info(`retrieve "${basename}" from the cache`);
      xFs.cp(cachedFile, outputFile);
      return {
        location: outputFile,
        hash: path.basename(cachedFile),
      };
    }
  }

  resp.log.info(`entry "${getObj.uri}" not in cache, continue with download`);
  const handler = resFrom[protocol];

  let error = null;
  for (let attempt = 1; attempt <= 10; ++attempt) {
    try {
      const res = yield handler(getObj, destPath, outputFile, resp, next);
      resp.log.info(`store ${basename} in the cache`);
      const [, ext] = res.match(/((?:\.tar)?\.[^.]+)$/);
      const hash = (yield fileChecksum(res, {algorithm: 'sha256'})) + ext;
      if (getObj.$hash && hash !== getObj.$hash) {
        throw new Error(`shasum has changed ${hash} != ${getObj.$hash}`);
      }
      xFs.cp(res, path.join(cacheRoot, hash));
      return {location: res, hash};
    } catch (ex) {
      error = ex;
      if (attempt < 10) {
        const delay = attempt * 1000;
        resp.log.warn(
          `error with ${basename}, attempt (${
            attempt + 1
          }) in ${delay}ms: ${ex}`
        );
        yield setTimeout(next, delay);
      }
    }
  }

  if (error) {
    throw error;
  }
});

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

  if (Object.prototype.hasOwnProperty.call(xExtract, ext)) {
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
  const uriObj = url.parse(getObj.uri);
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

const _fileFromUri = function (getObj, destPath, dlOnly, resp, callback) {
  var uriObj = url.parse(getObj.uri);

  switch (typeFromUri(getObj)) {
    case 'git': {
      resFrom.git(getObj, destPath, resp, (err, res) => {
        if (err) {
          callback(err);
          return;
        }

        if (res) {
          const {ref, location} = res;
          if (dlOnly) {
            callback(null, {ref, location});
            return;
          }
          fileFromRes(location, destPath, resp, (err, result) =>
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
          const {hash, location} = res;
          if (dlOnly) {
            callback(null, {hash, location});
            return;
          }
          fileFromRes(location, destPath, resp, (err, result) =>
            callback(null, {hash, ...result})
          );
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
          const {hash, location} = res;
          if (dlOnly) {
            callback(null, {hash, location});
            return;
          }
          fileFromRes(location, destPath, resp, (err, result) =>
            callback(null, {hash, ...result})
          );
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

const fileFromUri = watt(function* (getObj, share, dlOnly, resp, next) {
  const destPath = path.join(share, 'cache');

  if (!getObj.uri || !getObj.uri.length) {
    resp.log.verb('it looks like a meta-package, no URI defined');
    xFs.mkdir(destPath);
    return {location: destPath};
  }

  const _getObj = clone(getObj);
  delete _getObj.mirrors;
  const uris = [getObj.uri, ...getObj.mirrors];

  let _ex;

  for (const uri of uris) {
    _getObj.uri = uri;
    try {
      return yield _fileFromUri(_getObj, destPath, dlOnly, resp, next);
    } catch (ex) {
      _ex = ex;
    }
  }

  throw _ex;
});

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
   * white spaces ---------------------------------------------.
   * escaped double/single quotes  -----------------.          |
   * single-quotes ------------------.              |          |
   * double-quotes --.               |              |          |
   *                 |               |              |          |      */
  args /*            v               v              v          v      */
    .match(/("(?:\\"|[^"])+"|'(?:\\'|[^'])+'|(?:\\ |[^ \n'"])+|[ \n]+)/g)
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
  const isXroot = root.match(/[\\/]install[\\/]x[+]/);
  if (isXroot) {
    return;
  }

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

      if (
        (stl && stl.isDirectory()) ||
        !fullTarget.startsWith(root) ||
        xPlatform.getOs() === 'win'
      ) {
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
    /* DISABLED because necessary with unix packages
    newFileName = fileRegex(
      newFileName,
      /^(aux|con|com[1-9]|lpt[1-9]|nul|prn)($|\.[^.]*)/,
      '__peon_$1$2__'
    );
    */

    /* Duplicate filename (case-insensitive) */
    const norm = path.join(location, newFileName.toLowerCase());
    if (Object.prototype.hasOwnProperty.call(uniq, norm)) {
      newFileName = `${newFileName}__peon_${uniq[norm]}__`;
      ++uniq[norm];
    } else {
      uniq[norm] = 0;
    }

    return file !== newFileName ? newFileName : null;
  }, root);
};

/**
 * This function is useful to generate a script that can be loaded
 * in your shell in order to facilitate the debugging of a broken
 * source package.
 *
 * Shell Script
 * ============
 * Use the dot / source command:
 *   . ./source-debug-env
 * or
 *   source ./source-debug-env
 *
 * Batch
 * =====
 *   source-debug-env.cmd
 *
 * @param {string} share Path on the share directory for this package
 * @param {object} extra Extra payload
 */
function generateDebugEnv(share, extra) {
  const yaml = require('js-yaml');

  const debugEnv = path.join(share, 'source-debug-env');
  const _extra = clone(extra);
  delete _extra.env;
  const payload = yaml.safeDump(_extra, {lineWidth: 999});
  const env = {...process.env, ...extra.env};

  const cmdEsc = (line) =>
    line
      .split('\n')
      .map((line) =>
        line.trim() ? `echo ${line.replace(/([<>&|^%])/g, '^$1')}` : 'echo.'
      )
      .join('\r\n');

  const sh = () => {
    const exports = [];
    let script = '#!/bin/bash\n\n';
    for (const [key, value] of Object.entries(env)) {
      exports.push(`export ${key}='${value}'\n`);
    }
    exports.sort().forEach((entry) => (script += entry));

    script += `\n\necho '=================================== EXTRA ==================================='\n\n`;
    script += 'cat <<"EOF"\n';
    script += payload;
    script += '\nEOF';
    script += `\n\necho '============================================================================='`;

    script += `\n\necho '================================== COMMAND =================================='\n\n`;
    script += 'cat <<"EOF"\n';
    if (_extra.configure) {
      script += `configure:    ${_extra.configure
        .replaceAll('\n', ' ')
        .trim()}\n`;
    }
    if (_extra.args?.all) {
      script += `make all:     ${_extra.args.all.join(' ')}\n`;
    }
    if (_extra.args?.test) {
      script += `make test:    ${_extra.args.test.join(' ')}\n`;
    }
    if (_extra.args?.install) {
      script += `make install: ${_extra.args.install.join(' ')}\n`;
    }
    script += '\nEOF';
    script += `\n\necho '============================================================================='`;

    return script;
  };

  const cmd = () => {
    const exports = [];
    let script = '@echo off\r\n\r\n';
    for (const [key, value] of Object.entries(env)) {
      exports.push(`set "${key}=${value}"\r\n`);
    }
    exports.sort().forEach((entry) => (script += entry));

    script += `\r\n\r\necho =================================== EXTRA ===================================\r\n\r\n`;
    script += cmdEsc(payload);
    script += `\r\n\r\necho =============================================================================`;

    script += `\r\n\r\necho ================================== COMMAND ==================================\r\n\r\n`;
    if (_extra.configure) {
      script +=
        cmdEsc(
          `configure:    ${_extra.configure
            .replaceAll('\r', '')
            .replaceAll('\n', ' ')}`.trim()
        ) + '\r\n';
    }
    if (_extra.args?.all) {
      script +=
        cmdEsc(`make all:     ${_extra.args.all.join(' ')}`.trim()) + '\r\n';
    }
    if (_extra.args?.test) {
      script +=
        cmdEsc(`make test:    ${_extra.args.test.join(' ')}`.trim()) + '\r\n';
    }
    if (_extra.args?.install) {
      script +=
        cmdEsc(`make install: ${_extra.args.install.join(' ')}`.trim()) +
        '\r\n';
    }
    script += `\r\necho =============================================================================`;

    return script;
  };

  fse.writeFileSync(debugEnv, sh());
  fse.writeFileSync(debugEnv + '.cmd', cmd());
}

const _prepare = watt(function* (getObj, extra, dest, resp, next) {
  let prepare = true;
  let results = {};

  /*FETCH */
  const cache = path.join(dest, 'cache');
  resp.log.verb(`fetch ${cache}`);

  if (!fse.existsSync(cache)) {
    results = yield fileFromUri(getObj, dest, false, resp, next);
  } else {
    results.location = cache;
    prepare = false;
  }

  /* PREPARE */
  if (prepare && results.location && extra.prepare) {
    const interpreter = require('./interpreter.js');

    const currentDir = process.cwd();
    process.chdir(results.location);

    try {
      resp.log.info(`run prepare step`);
      yield interpreter.run(extra.prepare, null, resp, next);

      if (typeFromUri(getObj) === 'git') {
        const xScm = require('xcraft-core-scm');
        const repository = path.join(results.location, extra.location);
        results.ref = yield xScm.git.localRef(repository, resp);
      }
    } finally {
      process.chdir(currentDir);
    }
  }

  /* WPKG */
  /* Rename some files in order to pass the wpkg validations.
   * The files are restored with global postinst.
   */
  if (results.location && extra.onlyPackaging) {
    try {
      resp.log.verb('rename for wpkg');
      exports.renameForWpkg(results.location);
    } catch (ex) {
      if (ex.code !== 'EEXIST') {
        throw ex;
      }
      /* Maybe the files are already there because
       * it's not the first build
       */
      resp.log.warn(ex.stack ? ex.stack : ex);
    }
  }

  /* CONFIGURE */
  if (extra.configure && (extra.forceConfigure || results.location)) {
    resp.log.verb('configure');

    const interpreter = require('./interpreter.js');

    const currentDir = process.cwd();
    if (results.location) {
      process.chdir(results.location);
    } else {
      resp.log.warn(
        `configure executed without mount point, cwd: ${currentDir}`
      );
    }

    const env = Object.assign({}, process.env, extra.env);
    try {
      yield interpreter.run(extra.configure, env, resp, next);
    } finally {
      if (results.location) {
        process.chdir(currentDir);
      }
    }
  }

  return results;
});

exports.prepare = watt(function* (
  from,
  getObj,
  basePath,
  share,
  extra,
  resp,
  next
) {
  var os = require('os');
  var traverse = require('xcraft-traverse');
  var xConfig = require('xcraft-core-etc')(null, resp).load('xcraft');
  var xPh = require('xcraft-core-placeholder');
  var xPlatform = require('xcraft-core-platform');

  const arch = xPlatform.getToolchainArch();
  const rootDir = path.join(xConfig.pkgTargetRoot, arch);
  const targetRoot = path.join(xPacman.getTargetRoot(extra.distribution), arch);
  const assetsDir = path.join(share, 'assets');

  const normalize = (location, posix) => {
    if (extra.env?.PEON_UNIX_PATH === '1' || posix === true) {
      location = location.replace(/^([a-zA-Z]):/, '/$1');
    }
    return location.replace(/\\/g, '/');
  };

  /* Set default placeholders */
  xPh.global
    .set('XCRAFT.ROOT', normalize(xConfig.xcraftRoot))
    .set('POSIX.XCRAFT.ROOT', normalize(xConfig.xcraftRoot, true))
    .set('XCRAFT.HOME', normalize(path.join(xConfig.xcraftRoot, '/home')))
    .set(
      'POSIX.XCRAFT.HOME',
      normalize(path.join(xConfig.xcraftRoot, '/home'), true)
    )
    .set('WPKG.STAG', normalize(basePath))
    .set('POSIX.WPKG.STAG', normalize(basePath, true))
    .set('ASSETS', normalize(assetsDir))
    .set('POSIX.ASSETS', normalize(assetsDir, true))
    .set('OS.NAME', process.platform)
    .set('OS.ARCH', process.arch)
    .set('OS.ARCH2', xPlatform.getArchVariant(process.arch))
    .set('WPKG.ARCH', arch)
    .set('CPUS.COUNT', os.cpus().length)
    .set('OS', xPlatform.getOs())
    .set('ROOTDIR', normalize(rootDir))
    .set('POSIX.ROOTDIR', normalize(rootDir, true))
    .set('PROD.ROOTDIR', normalize(targetRoot))
    .set('POSIX.PROD.ROOTDIR', normalize(targetRoot, true))
    .set('ENV', process.env)
    .set('ROOTTEMP', normalize(xConfig.tempRoot))
    .set('POSIX.ROOTTEMP', normalize(xConfig.tempRoot, true))
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
  if (Object.prototype.hasOwnProperty.call(extra, 'args')) {
    Object.keys(extra.args).forEach(function (key) {
      var result = [];

      if (
        !Object.prototype.hasOwnProperty.call(extra.args, key) ||
        !extra.args[key]
      ) {
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

  if (from === 'onlyBuild') {
    generateDebugEnv(share, extra);
    /* Stop the processing, we begin the whole stuff just for debugging.
     * It's then possible to use the source-debug-env(.cmd) script in order
     * to debug manually the source package build.
     */
    if (process.env.PEON_DEBUG_PKG === extra.name) {
      return;
    }
  }

  const {wrapTmp, Subst} = require('xcraft-core-subst');

  /* Fetch and configure the resource, then continue with the backend. */
  let dest = share;
  let unwrap = (callback) => callback();
  let subst = null;

  if (from === 'onlyBuild' && !extra.onlyPackaging) {
    ({dest, unwrap} = wrapTmp(share, 'build', resp, true));
  } else {
    subst = new Subst(share, resp);
    dest = yield subst.mount();
    unwrap = (callback) => subst.umount(callback);
  }

  try {
    const results = yield _prepare(getObj, extra, dest, resp);
    return {
      unwrap,
      extra,
      ...results,
    };
  } catch (ex) {
    yield unwrap(next);
    throw ex;
  }
});

/**
 * @param {object} resp Response object
 * @returns {object} logger
 */
function log(resp) {
  return resp
    ? resp.log
    : {
        verb: console.log,
        info: console.log,
        warn: console.log,
        err: console.error,
        dbg: console.log,
      };
}

const rpathFixupDarwin = watt(function* (params, resp, next) {
  let {prefix, targetRoot} = params;

  const xProcess = require('xcraft-core-process')(
    resp ? {logger: 'xlog', resp} : null
  );

  if (!targetRoot) {
    const xConfig = require('xcraft-core-etc')(null, resp).load('xcraft');
    const arch = xPlatform.getToolchainArch();
    targetRoot = path.join(xConfig.pkgTargetRoot, arch);
  }
  const rootLibDir = path.join(targetRoot, 'usr/lib');

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
  /* TODO: add rpath libexec support */

  /**
   * @yields
   * @param {string[]} args Arguments for install_name_tool
   * @param {Function} next Callback
   * @returns {*} child_process
   */
  function* installNameTool(args, next) {
    return yield xProcess.spawn('install_name_tool', args, {}, next);
  }

  /**
   * @yields
   * @param {string[]} args Arguments for otool
   * @param {Function} callbackStdout Callback for stdout
   * @param {Function} next Callback
   * @returns {*} child_process
   */
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
      _dylibs = xFs.lsall(libDir, false, (lib) => /\.dylib$/.test(lib));
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  for (const dylib of _dylibs) {
    const dylibName = path.basename(dylib);
    const isSymlink = fse.lstatSync(dylib).isSymbolicLink();
    if (!isSymlink) {
      log(resp).info(`set rpath id for ${dylib} to @rpath/${dylibName}`);
      try {
        yield* installNameTool(['-id', `@rpath/${dylibName}`, dylib], next);
      } catch (ex) {
        continue;
      }
      bins.push(dylib);
    }
    dylibs.push(dylib);
  }

  if (binDir) {
    try {
      bins = bins.concat(
        xFs.lsall(
          binDir,
          false,
          (bin) => !fse.lstatSync(path.join(binDir, bin)).isSymbolicLink()
        )
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
        ['-rpath', rootLibDir, `@loader_path/${relativePath}`, bin],
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

  let {prefix, targetRoot} = params;

  const isBinaryFile = require('isbinaryfile');
  const xProcess = require('xcraft-core-process')(
    resp ? {logger: 'xlog', resp} : null
  );

  if (!targetRoot) {
    const xConfig = require('xcraft-core-etc')(null, resp).load('xcraft');
    const arch = xPlatform.getToolchainArch();
    targetRoot = path.join(xConfig.pkgTargetRoot, arch);
  }
  const rootLibDir = path.join(targetRoot, 'usr/lib');
  const rootLibDir64 = path.join(targetRoot, 'usr/lib64');

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
  const libexecDir =
    params.libexecDir !== undefined
      ? params.libexecDir
        ? path.resolve(params.libexecDir)
        : null
      : path.join(prefix, 'libexec');

  /**
   * @yields
   * @param {string[]} args Arguments for patchelf
   * @param {Function} next Callback
   * @returns {*} child_process
   */
  function* patchelf(args, next) {
    return yield xProcess.spawn('patchelf', args, {}, next);
  }

  /**
   * @yields
   * @param {string} file File location
   * @param {Function} next Callback
   * @returns {boolean} true if it's a GO binary
   */
  function* isGoBinary(file, next) {
    let _data;
    yield xProcess.spawn('file', [file], {}, next, (data) => (_data = data));
    return /Go BuildID=/.test(_data);
  }

  let bins = [];
  let libs = [];
  let libexecs = [];

  if (binDir) {
    try {
      bins = xFs.lsall(binDir);
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  if (libDir) {
    try {
      libs = xFs.lsall(libDir, false, (lib) => !/\.a$/.test(lib));
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  if (libexecDir) {
    try {
      libexecs = xFs.lsall(libexecDir);
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  const files = bins
    .concat(libs)
    .concat(libexecs)
    .filter((file) => !fse.lstatSync(file).isSymbolicLink())
    .filter((file) => isBinaryFile.sync(file));

  for (const file of files) {
    log(resp).info(`try to fix rpath for ${file}`);

    /* patchelf 0.13 is not working correctly with Go, we should check
     * again when a new patchelf release will be published.
     */
    if (yield* isGoBinary(file, next)) {
      log(resp).info(`skip ${file}, it's a Go binary`);
      continue;
    }

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
exports.fileFromUri = fileFromUri;
exports.cleanUri = cleanUri;

exports.rpathFixup = watt(function* (prefix, resp, targetRoot) {
  const params = {prefix, targetRoot};
  switch (xPlatform.getOs()) {
    case 'darwin': {
      return yield rpathFixupDarwin(params, resp);
    }

    case 'linux': {
      return yield rpathFixupLinux(params, resp);
    }
  }
});

exports.rpathFixupDir = watt(function* (
  prefix,
  libDir,
  binDir,
  resp,
  targetRoot
) {
  const params = {prefix, libDir, binDir, targetRoot};
  switch (xPlatform.getOs()) {
    case 'darwin': {
      return yield rpathFixupDarwin(params, resp);
    }

    case 'linux': {
      return yield rpathFixupLinux(params, resp);
    }
  }
});
