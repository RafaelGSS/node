// Flags: --experimental-permission --allow-child-process --allow-fs=read
'use strict';

require('../common');
const assert = require('assert');
const childProcess = require('child_process');

if (process.argv[2] === 'child') {
  process.exit(0);
}

// Guarantee the initial state
{
  assert.ok(!process.permission.has('fs.write'));
}

// When a permission is set by cli, the process shouldn't be able
// to spawn unless --allow-child-process is sent
{
  // doesNotThrow
  childProcess.spawnSync('node', ['--version']);
  childProcess.execSync('node', ['--version']);
  childProcess.fork(__filename, ['child']);
  childProcess.execFileSync('node', ['--version']);
}
