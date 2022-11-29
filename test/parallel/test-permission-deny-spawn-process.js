// Flags: --experimental-permission
'use strict';

const common = require('../common');
const assert = require('assert');
const childProcess = require('child_process');

if (process.argv[2] === 'child') {
  process.exit(0);
}

{
  // doesNotThrow
  const spawn = childProcess.spawn('node', ['--version']);
  spawn.kill();
  const exec = childProcess.exec('node', ['--version']);
  exec.kill();
  const fork = childProcess.fork(__filename, ['child']);
  fork.kill();
  const execFile = childProcess.execFile('node', ['--version']);
  execFile.kill();

  assert.ok(process.permission.deny('child'));

  // When a permission is set by API, the process shouldn't be able
  // to spawn
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
