'use strict';

const watt = require('gigawatts');
var path = require('path');
var utils = require('./utils.js');

const xPlatform = require('xcraft-core-platform');
const xPacman = require('xcraft-contrib-pacman');

const proceed = watt(function* (proceedCb, data, extra, resp, next) {
  if (extra.hasOwnProperty('location') && extra.location.length) {
    data.fullLocation = path.join(data.location, extra.location);
  } else {
    data.fullLocation = data.location;
  }

  yield proceedCb(data, next);

  if (extra.test && extra.test !== 'none') {
    const test = require(path.join(extra._rulesTypeDir, 'test', extra.test));
    yield test(data, extra, resp, next);
  }

  if (!extra.deploy || !extra.deploy.length) {
    return;
  }

  const interpreter = require('./interpreter.js');
  const currentDir = process.cwd();
  try {
    process.chdir(data.location);

    resp.log.info(`run deploy step`);
    yield interpreter.run(extra.deploy, null, resp, next);
  } finally {
    process.chdir(currentDir);
  }
});

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

  if (process.env.PEON_DEBUG_PKG === extra.name) {
    return;
  }

  if (extra.onlyPackaging || !extra.hasOwnProperty('location')) {
    yield data.unwrap(next);
    return {ref: data.ref, hash: data.hash};
  }
  yield proceed(proceedCb, data, extra, resp, next);
  yield data.unwrap(next);

  for (const subPackage in extra.prefix) {
    utils.renameForWpkg(extra.prefix[subPackage]);

    const arch = xPlatform.getToolchainArch();
    const targetRoot = path.join(
      xPacman.getTargetRoot(extra.distribution),
      arch
    );
    if (!extra.env.PEON_NORPATH) {
      yield utils.rpathFixup(extra.prefix[subPackage], resp, targetRoot);
    }
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
