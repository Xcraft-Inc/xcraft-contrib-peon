'use strict';

const xunit = function (cache, extra, response, callback) {
  const fs = require ('fs');
  const path = require ('path');

  const xProcess = require ('xcraft-core-process') ({
    logger: 'xlog',
    //    forwarder: 'msbuild',
    //    parser:    'msbuild',
    resp: response,
  });

  response.log.verb ('cache: ' + cache + ' ' + JSON.stringify (extra));

  const testBin = 'xunit.console';

  const xSubst = require ('xcraft-core-subst');

  const dir = cache;
  let file = null;

  if (
    extra.args.test.length &&
    fs.statSync (path.join (dir, extra.args.test[0])).isFile ()
  ) {
    file = extra.args.test.shift ();
  }

  xSubst.wrap (
    dir,
    response,
    (err, dest, callback) => {
      if (err) {
        callback (err);
        return;
      }

      let args = [path.join (dest, file)];

      if (extra.args.test) {
        args = args.concat (extra.args.test);
        args.push ('-parallel', 'none', '-verbose');
      }

      response.log.verb (testBin + ' ' + args.join (' '));
      xProcess.spawn (testBin, args, {}, callback);
    },
    callback
  );
};

module.exports = function (data, extra, response, callback) {
  xunit (data.fullLocation, extra, response, callback);
};
