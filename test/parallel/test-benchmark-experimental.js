'use strict';

require('node:benchmark');
const common = require('../common');
const assert = require('assert');

// This test ensures that the experimental message is emitted
// when using permission system

process.on('warning', common.mustCall((warning) => {
  assert.match(warning.message, /The benchmark module is an experimental feature/);
}, 1));
