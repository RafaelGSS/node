'use strict';
const { ObjectAssign } = primordials;
const { run, bench } = require('internal/benchmark/runner');
const { emitExperimentalWarning } = require('internal/util');

emitExperimentalWarning('The benchmark module');

ObjectAssign(module.exports, {
  run,
  bench,
});
