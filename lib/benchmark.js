'use strict';
const { ObjectAssign } = primordials;
const { bench } = require('internal/benchmark/runner');
const { emitExperimentalWarning } = require('internal/util');

emitExperimentalWarning('The benchmark module');

ObjectAssign(module.exports, {
  bench,
});
