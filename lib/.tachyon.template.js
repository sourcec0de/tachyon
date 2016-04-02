'use strict';

module.exports = {
  query: [
    'allof',
    ['match', '*.js'],
    ['not', ['dirname', 'node_modules']],
    ['not', ['dirname', 'tests']]
  ],
  testQuery: [
    'allof',
    ['match', '*.js'],
    ['not', ['dirname', 'tests/fixtures']]
  ],
  testDir: './tests',
  command: 'mocha'
};