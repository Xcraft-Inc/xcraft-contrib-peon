'use strict';

/**
 * Retrieve the inquirer definition for xcraft-core-etc
 */
module.exports = [
  {
    type: 'input',
    name: 'cache.http.attempts',
    message: 'how much attempts when trying to download with http',
    default: 3,
  },
  {
    type: 'input',
    name: 'cache.http.factor',
    message: 'factor [ms] of time for each attempt (delay = attempt * factor)',
    default: 1000,
  },
];
