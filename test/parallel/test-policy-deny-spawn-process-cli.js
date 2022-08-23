// Flags: --policy-deny-fs=out
'use strict';

const common = require('../common');
const assert = require('assert');
const childProcess = require('child_process');

if (process.argv[2] === 'child') {
  process.exit(0);
}

// Guarantee the initial state
{
  assert.ok(!process.policy.check('fs.out'));
}

// When a permission is set by cli, the process shouldn't be able
// to spawn
{
  assert.throws(() => {
    childProcess.spawn('node', ['--version']);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'ChildProcess',
  }));
  assert.throws(() => {
    childProcess.exec('node', ['--version']);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'ChildProcess',
  }));
  assert.throws(() => {
    childProcess.fork(__filename, ['child']);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'ChildProcess',
  }));
  assert.throws(() => {
    childProcess.execFile('node', ['--version']);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'ChildProcess',
  }));
}
