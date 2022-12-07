// Flags: --experimental-permission --allow-fs=read
'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const assert = require('assert');
const fixtures = require('../common/fixtures');
const { spawnSync } = require('child_process');

const protectedFile = fixtures.path('permission', 'deny', 'protected-file.md');
const relativeProtectedFile = './test/fixtures/permission/deny/protected-file.md';

// Note: for relative path on fs.* calls, check test-permission-deny-fs-[read/write].js files

{
  // permission.deny relative path should work
  assert.ok(process.permission.check('fs.read', protectedFile));
  assert.ok(process.permission.deny('fs.read', [relativeProtectedFile]));
  assert.ok(!process.permission.check('fs.read', protectedFile));
}

{
  // permission.check relative path should work
  assert.ok(!process.permission.check('fs.read', relativeProtectedFile));
}

{
  // relative path as CLI args are NOT supported yet
  const { status, stdout } = spawnSync(
    process.execPath,
    [
      '--experimental-permission',
      '--allow-fs', 'read,write:../fixtures/permission/deny/regular-file.md',
      '-e',
      `
      const path = require("path");
      const absolutePath = path.resolve("../fixtures/permission/deny/regular-file.md");
      console.log(process.permission.check("fs.write", absolutePath));
       `,
    ]
  );

  const [fsWrite] = stdout.toString().split('\n');
  assert.strictEqual(fsWrite, 'false');
  assert.strictEqual(status, 0);
}
