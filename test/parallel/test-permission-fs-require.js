// Flags: --experimental-permission --allow-fs-read=* --allow-child-process
'use strict';

const common = require('../common');
common.skipIfWorker();
const fixtures = require('../common/fixtures');

const assert = require('node:assert');
const { spawnSync } = require('node:child_process');

{
  const mainModule = fixtures.path('permission', 'main-module.js');
  const requiredModule = fixtures.path('permission', 'required-module.js');
  // Relative path as CLI args are supported
  const { status, stdout, stderr } = spawnSync(
    process.execPath,
    [
      '--experimental-permission',
      '--allow-fs-read', mainModule,
      '--allow-fs-read', requiredModule,
      mainModule,
    ]
  );

  assert.strictEqual(status, 0, stderr.toString());
  assert.strictEqual(stdout.toString(), 'ok');
}
