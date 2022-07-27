'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const { spawnSync } = require('child_process');
const assert = require('assert');
const fs = require('fs');

{
  const { status, stdout } = spawnSync(
    process.execPath,
    [
      '--policy-deny-fs', 'fs', '-e',
      `console.log(process.policy.check("fs"));
       console.log(process.policy.check("fs.in"));
       console.log(process.policy.check("fs.out"));`,
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

      '--policy-deny-fs', 'in', '-e',
      `console.log(process.policy.check("fs"));
       console.log(process.policy.check("fs.in"));
       console.log(process.policy.check("fs.out"));`,
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
      '--policy-deny-fs', 'out', '-e',
      `console.log(process.policy.check("fs"));
       console.log(process.policy.check("fs.in"));
       console.log(process.policy.check("fs.out"));`,
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
      '--policy-deny-fs', 'out,in', '-e',
      `console.log(process.policy.check("fs"));
       console.log(process.policy.check("fs.in"));
       console.log(process.policy.check("fs.out"));`,
    ]
  );

  const [fs, fsIn, fsOut] = stdout.toString().split('\n');
  assert.strictEqual(fs, 'false');
  assert.strictEqual(fsIn, 'false');
  assert.strictEqual(fsOut, 'false');
  assert.strictEqual(status, 0);
}

{
  const { status, stderr } = spawnSync(
    process.execPath,
    ['--policy-deny-fs=in', '-p', 'fs.readFileSync(process.execPath)']);
  assert.ok(
    stderr.toString().includes('Access to this API has been restricted'),
    stderr);
  assert.strictEqual(status, 1);
}

{
  const { status, stderr } = spawnSync(
    process.execPath,
    ['--policy-deny-fs=fs', '-p', 'fs.readFileSync(process.execPath)']);
  assert.ok(
    stderr.toString().includes('Access to this API has been restricted'),
    stderr);
  assert.strictEqual(status, 1);
}

{
  const { status, stderr } = spawnSync(
    process.execPath,
    ['--policy-deny-fs=out', '-p', 'fs.writeFileSync("policy-deny-example.md", "# test")']);
  assert.ok(
    stderr.toString().includes('Access to this API has been restricted'),
    stderr);
  assert.strictEqual(status, 1);
  assert.ok(!fs.existsSync('policy-deny-example.md'));
}
