// Flags: --policy-deny-fs=out
'use strict';

const common = require('../common');
const assert = require('assert');
const {
  Worker,
  isMainThread,
} = require('worker_threads');

// Guarantee the initial state
{
  assert.ok(!process.policy.check('fs.out'));
}

if (isMainThread) {
  assert.throws(() => {
    new Worker(__filename);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'WorkerThreads',
  }));
} else {
  assert.fail('it should not be called');
}
