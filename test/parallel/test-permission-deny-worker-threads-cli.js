// Flags: --experimental-permission --allow-fs-read=*
'use strict';

const common = require('../common');
const assert = require('assert');
const {
  Worker,
  isMainThread,
} = require('worker_threads');

// Guarantee the initial state
{
  assert.ok(!process.permission.has('fs.write'));
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
