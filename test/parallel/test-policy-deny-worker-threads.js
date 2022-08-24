'use strict';

const common = require('../common');
const assert = require('assert');

const {
  Worker,
  isMainThread,
} = require('worker_threads');

function blockedEnv() {
  // When a permission is set by API, the process shouldn't be able
  // to create worker threads
  assert.ok(process.policy.deny('worker'));
  assert.throws(() => {
    new Worker(__filename);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'ChildProcess',
  }));
}

{
  if (isMainThread) {
    // doesNotThrow
    const worker = new Worker(__filename);
    worker.on('exit', blockedEnv)
  } else {
    process.exit(0);
  }
}
