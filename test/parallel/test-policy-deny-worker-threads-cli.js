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
    const worker = new Worker(__filename);
    worker.o
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'ChildProcess',
  }));
} else {
  t.fail('it must not be called');
}
