'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const fixtures = require('../common/fixtures');

const { spawnSync } = require('child_process');
const assert = require('assert')

const dep = fixtures.path('policy', 'deny', 'check.js');

{
  const { status, stdout } = spawnSync(
    process.execPath,
    [
      '--policy-deny', 'fs', dep
    ]
  );

  const [fs, fsIn, fsOut] = stdout.toString().split('\n');
  assert.strictEqual(fs, 'false');
  assert.strictEqual(fsIn, 'false');
  assert.strictEqual(fsOut, 'false');
  assert.strictEqual(status, 0);
}

{
  const { status, stdout } = spawnSync(
    process.execPath,
    [
      '--policy-deny', 'fs.in', dep
    ]
  );

  const [fs, fsIn, fsOut] = stdout.toString().split('\n');
  assert.strictEqual(fs, 'true');
  assert.strictEqual(fsIn, 'false');
  assert.strictEqual(fsOut, 'true');
  assert.strictEqual(status, 0);
}

{
  const { status, stdout } = spawnSync(
    process.execPath,
    [
      '--policy-deny', 'fs.out', dep
    ]
  );

  const [fs, fsIn, fsOut] = stdout.toString().split('\n');
  assert.strictEqual(fs, 'true');
  assert.strictEqual(fsIn, 'true');
  assert.strictEqual(fsOut, 'false');
  assert.strictEqual(status, 0);
}

{
  const { status, stdout } = spawnSync(
    process.execPath,
    [
      '--policy-deny', 'fs.in,fs.out', dep
    ]
  );

  const [fs, fsIn, fsOut] = stdout.toString().split('\n');
  assert.strictEqual(fs, 'true');
  assert.strictEqual(fsIn, 'false');
  assert.strictEqual(fsOut, 'false');
  assert.strictEqual(status, 0);
}

{
  const { status, stderr } = spawnSync(
    process.execPath,
    ['--policy-deny=fs.in', '-p', 'fs.readFileSync(process.execPath)']);
  assert.ok(
    stderr.toString().includes('Access to this API has been restricted'),
    stderr);
  assert.strictEqual(status, 1);
}
